// scripts/tenants_submit.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { keccak256 } = require("ethers");

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

async function main() {
  const tenantsFile = path.join(__dirname, ".tenants.localhost.json");
  if (!fs.existsSync(tenantsFile)) throw new Error("Missing " + tenantsFile + " (run tenants_deploy_phase3.js first)");
  const { tenants } = JSON.parse(fs.readFileSync(tenantsFile, "utf8"));

  const runs = parseInt(process.env.RUNS || "1", 10);
  const outPath = path.join(__dirname, "tenants_results.ndjson");
  const out = fs.createWriteStream(outPath, { flags: "a" });

  const signers = await hre.ethers.getSigners();

  const BOUND = 100n;

  for (let i = 0; i < tenants.length; i++) {
    const t = tenants[i];
    const signer = signers[i % signers.length];
    const subject = signer.address;
    const rep = await hre.ethers.getContractAt("ReputationWithZK", t.reputationZK, signer);

    for (let r = 0; r < runs; r++) {
      const rating = BigInt(process.env.RATING ?? (80 + ((i + r) % 5)));
      const weight = 100n;

      const ev = { tenant: t.tenant, subject, rating: Number(rating), when: Date.now(), note: "tenant evidence" };
      const evPath = path.join(__dirname, `evidence_t${t.tenant}_r${r}.json`);
      fs.writeFileSync(evPath, JSON.stringify(ev));

      let cid = "NA";
      try {
        cid = sh(`ipfs add -q ${evPath} | tail -1`);
      } catch (e) {
        console.error("ipfs add failed (is daemon running?)", e.message);
      }

      const bytes = fs.readFileSync(evPath);
      const evHash = keccak256(bytes);

      const a = [0n, 0n];
      const b = [[0n, 0n],[0n, 0n]];
      const c = [0n, 0n];

      const input = Array(10).fill(0n);
      input[0] = 100n;
      input[1] = rating;
      input[2] = BigInt(evHash);

      const t0 = Date.now();
      const tx = await rep.submitFeedbackZK(subject, [a,b,c], input, rating, weight);
      const receipt = await tx.wait();
      const t1 = Date.now();

      const rec = {
        tenant: t.tenant, subject, reputationZK: t.reputationZK,
        txHash: tx.hash, gasUsed: receipt.gasUsed.toString(),
        latency_ms: t1 - t0, rating: Number(rating), weight: Number(weight),
        cid, evidenceHash: evHash
      };
      const line = JSON.stringify(rec);
      console.log(line);
      out.write(line + "\n");
    }
  }
  out.end();
  console.log("Wrote", outPath);
}
main().catch((e) => { console.error(e); process.exit(1); });
