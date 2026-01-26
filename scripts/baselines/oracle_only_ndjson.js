/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

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

function hasFn(contract, name) {
  try { contract.interface.getFunction(name); return true; } catch { return false; }
}
function guessArg(ethers, param, deployerAddr) {
  const n = (param.name || "").toLowerCase();
  const t = (param.type || "").toLowerCase();

  if (t === "address") {
    if (n.includes("owner") || n.includes("admin") || n.includes("govern") || n.includes("manager")) return deployerAddr;
    return ethers.ZeroAddress;
  }
  if (t.startsWith("uint")) {
    if (n.includes("bound") || n.includes("smax") || n.includes("max") || n.includes("limit")) return 100n;
    return 0n;
  }
  if (t === "bytes32") return ethers.ZeroHash;
  if (t === "bool") return false;
  if (t === "string") return "";
  if (t === "bytes") return "0x";

  // arrays (safe defaults)
  if (t.endsWith("[]")) return [];

  // fallback
  return 0;
}

async function deployByArtifact(hre, fqn) {
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();

  const artifact = await hre.artifacts.readArtifact(fqn);
  const ctor = artifact.abi.find((x) => x.type === "constructor");
  const inputs = (ctor && ctor.inputs) ? ctor.inputs : [];
  const args = inputs.map((p) => guessArg(ethers, p, deployer.address));

  const F = await ethers.getContractFactory(fqn, deployer);
  const c = await F.deploy(...args);
  await c.waitForDeployment();
  return c;
}
async function deployReputationManager(hre) {
  const all = await hre.artifacts.getAllFullyQualifiedNames();

  // Prefer exact concrete match (avoid interfaces like IVerifier)
  const fqn =
    all.find((n) => /:ReputationManager$/i.test(n)) ||
    all.find((n) => /ReputationManager/i.test(n));

  if (!fqn) {
    throw new Error("ReputationManager artifact not found.");
  }
  return await deployByArtifact(hre, fqn);
}

function pickOracleFn(rm) {
  const cands = [
    "postAutoScore",
    "postOracleScore",
    "postScore",
    "setScore",
  ];
  for (const fn of cands) if (hasFn(rm, fn)) return fn;
  throw new Error("No known oracle-score function found on ReputationManager.");
}
async function main() {
  const hre = require("hardhat");
  const ethers = hre.ethers;

  const out = mustEnv("NDJSON_OUT");
  const N = Number(process.env.N || "50");

  ensureDir(path.dirname(out));
  fs.writeFileSync(out, "", { encoding: "utf-8" });

  const rm = await deployReputationManager(hre);
  const [oracle] = await ethers.getSigners();

  // Best-effort: grant ORACLE_ROLE if present
  try {
    const role = await rm.ORACLE_ROLE();
    const has = await rm.hasRole(role, oracle.address);
    if (!has) {
      const tx = await rm.grantRole(role, oracle.address);
      await tx.wait();
    }
  } catch (_) {}

  const fnName = pickOracleFn(rm);
  const fn = rm[fnName].bind(rm);

  for (let i = 1; i <= N; i++) {
    const modelId = ethers.encodeBytes32String(String(i));
    const bp = 7800 + (i % 5);

    const t0 = performance.now();
    const tx = await fn(modelId, bp);
    const rc = await tx.wait();
    const t1 = performance.now();

    appendNdjson(out, {
      ts: nowIso(),
      mode: "baseline_oracle_only",
      i,
      model_id: modelId,
      score_bp: bp,
      txHash: tx.hash,
      latency_ms: Math.round(t1 - t0),
      gasUsed: rc.gasUsed ? rc.gasUsed.toString() : null,
      contract: await rm.getAddress(),
      fn: fnName,
    });
  }

  console.log(`[OK] wrote NDJSON -> ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
