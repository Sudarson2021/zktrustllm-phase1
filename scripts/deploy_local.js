const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) MockVerifier
  const MockVerifier = await ethers.getContractFactory("MockVerifier");
  const verifier = await MockVerifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log("MockVerifier:", verifierAddr);

  // 2) ReputationWithZK(verifier)
  const ReputationWithZK = await ethers.getContractFactory("ReputationWithZK");
  const zk = await ReputationWithZK.deploy(verifierAddr);
  await zk.waitForDeployment();
  const zkAddr = await zk.getAddress();
  console.log("ReputationWithZK:", zkAddr);

  // 3) ReputationManager(_verifier, oracle)
  const ReputationManager = await ethers.getContractFactory("ReputationManager");
  const oracle = deployer.address; // use deployer as oracle for now
  const rm = await ReputationManager.deploy(verifierAddr, oracle);
  await rm.waitForDeployment();
  const rmAddr = await rm.getAddress();
  console.log("ReputationManager:", rmAddr);

  // Save addresses
  const out = { MockVerifier: verifierAddr, ReputationWithZK: zkAddr, ReputationManager: rmAddr };
  const outPath = path.join(__dirname, ".addr.localhost.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Saved:", outPath);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
