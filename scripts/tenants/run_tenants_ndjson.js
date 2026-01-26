/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const crypto = require("crypto");

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function appendNdjson(outPath, obj) {
  fs.appendFileSync(outPath, JSON.stringify(obj) + "\n", { encoding: "utf-8" });
}
function nowIso() { return new Date().toISOString(); }

function buildProofZero() { return [[0n,0n], [[0n,0n],[0n,0n]], [0n,0n]]; }

function buildInputs(bound, rating, evidenceU256) {
  const arr = new Array(10).fill(0n);
  arr[0] = BigInt(bound);
  arr[1] = BigInt(rating);
  arr[2] = BigInt(evidenceU256);
  return arr;
}

function randEvidenceJson(tenantIdx, runIdx) {
  return JSON.stringify({
    tenant: tenantIdx,
    run: runIdx,
    ts: Date.now(),
    nonce: crypto.randomBytes(8).toString("hex"),
    note: "ZKTrustLLM evidence blob (demo)",
  });
}

function ipfsAddSync(filePath) {
  const { execSync } = require("child_process");
  const cmd = `ipfs add -q "${filePath}" | tail -n 1`;
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

async function pickVerifierFactory(hre) {
  const names = await hre.artifacts.getAllFullyQualifiedNames();
  const pick =
    names.find((n) => /Mock.*Verifier/i.test(n)) ||
    names.find((n) => /Groth16.*Verifier/i.test(n)) ||
    names.find((n) => /Verifier/i.test(n));
  if (!pick) throw new Error("No verifier contract found (expected *Verifier* artifact).");
  return hre.ethers.getContractFactory(pick);
}
async function deployReputationWithZK(hre, verifierAddr) {
  const names = await hre.artifacts.getAllFullyQualifiedNames();
  const repFqn = names.find((n) => /ReputationWithZK/i.test(n));
  if (!repFqn) throw new Error("ReputationWithZK artifact not found.");

  const repArtifact = await hre.artifacts.readArtifact(repFqn);
  const ctor = repArtifact.abi.find((x) => x.type === "constructor");
  const inputs = (ctor && ctor.inputs) ? ctor.inputs : [];

  const [deployer] = await hre.ethers.getSigners();
  const args = inputs.map((p) => {
    const n = (p.name || "").toLowerCase();
    if (p.type === "address" && n.includes("verifier")) return verifierAddr;
    if (p.type === "address" && (n.includes("owner") || n.includes("admin"))) return deployer.address;
    if (p.type === "uint256" && (n.includes("bound") || n.includes("smax") || n.includes("max"))) return 100n;
    if (p.type === "address") return hre.ethers.ZeroAddress;
    if (p.type.startsWith("uint")) return 0n;
    return 0;
  });

  const Rep = await hre.ethers.getContractFactory(repFqn);
  const rep = await Rep.deploy(...args);
  await rep.waitForDeployment();
  return rep;
}
async function main() {
  const hre = require("hardhat");
  const ethers = hre.ethers;

  const mode = process.env.MODE || "main"; // main | no_ipfs
  const tenants = Number(process.env.TENANTS || "10");
  const runs = Number(process.env.RUNS || "5");
  const ndjsonOut = mustEnv("NDJSON_OUT");
  const evidDir = process.env.EVID_DIR || path.join(process.cwd(), "artifacts/out/evidence");

  ensureDir(path.dirname(ndjsonOut));
  ensureDir(evidDir);
  fs.writeFileSync(ndjsonOut, "", { encoding: "utf-8" });

  const signers = await ethers.getSigners();
  const bound = 100;
  const weight = 100;

  for (let t = 1; t <= tenants; t++) {
    const signer = signers[(t - 1) % signers.length];

    const Verifier = await pickVerifierFactory(hre);
    const verifier = await Verifier.connect(signer).deploy();
    await verifier.waitForDeployment();

    const rep = await deployReputationWithZK(hre, await verifier.getAddress());

    for (let r = 1; r <= runs; r++) {
      const rating = 80 + ((t + r) % 5); // [80,84]
      const evidence = randEvidenceJson(t, r);
      const evidPath = path.join(evidDir, `tenant${t}_run${r}.json`);
      fs.writeFileSync(evidPath, evidence, { encoding: "utf-8" });

      let cid = "";
      if (mode === "main") cid = ipfsAddSync(evidPath);

      const evidenceHashHex = ethers.keccak256(ethers.toUtf8Bytes(evidence));
      const evidenceU256 = BigInt(evidenceHashHex);

      const proof = buildProofZero();
      const input = buildInputs(bound, rating, evidenceU256);
      const subject = signer.address;

      const t0 = performance.now();
      const tx = await rep.connect(signer).submitFeedbackZK(subject, proof, input, rating, weight);
      const rcpt = await tx.wait();
      const t1 = performance.now();

      appendNdjson(ndjsonOut, {
        ts: nowIso(),
        mode,
        tenant: t,
        run: r,
        subject,
        txHash: tx.hash,
        gasUsed: rcpt.gasUsed ? rcpt.gasUsed.toString() : null,
        latency_ms: Math.round(t1 - t0),
        cid,
        evidenceHash: evidenceHashHex,
      });
    }
  }

  console.log(`[OK] wrote NDJSON -> ${ndjsonOut}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
