// scripts/tenants_deploy_phase3.js
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const N = parseInt(process.env.TENANTS || "10", 10);
  const outPath = path.join(__dirname, ".tenants.localhost.json");

  const Verifier = await hre.ethers.getContractFactory("MockVerifier");
  const ZK = await hre.ethers.getContractFactory("ReputationWithZK");

  const tenants = [];
  for (let i = 0; i < N; i++) {
    const verifier = await Verifier.deploy(); await verifier.waitForDeployment();
    const vaddr = await verifier.getAddress();
    const rep = await ZK.deploy(vaddr); await rep.waitForDeployment();
    const raddr = await rep.getAddress();
    tenants.push({ tenant: i+1, verifier: vaddr, reputationZK: raddr });
    console.log(`Tenant ${i+1}: verifier=${vaddr} zkRep=${raddr}`);
  }
  fs.writeFileSync(outPath, JSON.stringify({ network: "localhost", tenants }, null, 2));
  console.log("Wrote", outPath);
}
main().catch((e) => { console.error(e); process.exit(1); });
