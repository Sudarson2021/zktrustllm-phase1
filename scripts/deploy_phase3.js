const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // 1) Verifier (MockVerifier always returns true and expects ZoKrates/Groth16 shapes)
  const Verifier = await hre.ethers.getContractFactory("MockVerifier");
  const verifier  = await Verifier.deploy();
  await verifier.waitForDeployment();
  const VERIFIER_ADDR = await verifier.getAddress();
  console.log("MockVerifier:    ", VERIFIER_ADDR);

  // 2) ZK-capable reputation contract
  const ZK = await hre.ethers.getContractFactory("ReputationWithZK");
  const rmZK = await ZK.deploy(VERIFIER_ADDR);
  await rmZK.waitForDeployment();
  const ZK_REP_ADDR = await rmZK.getAddress();
  console.log("ReputationWithZK:", ZK_REP_ADDR);

  // persist to .env for convenience
  const fs = require("fs");
  const env = [
    `ZK_REP_ADDR=${ZK_REP_ADDR}`,
    `VERIFIER_ADDR=${VERIFIER_ADDR}`,
  ].join("\n") + "\n";
  fs.appendFileSync(".env", env);
}

main().catch((e) => { console.error(e); process.exit(1); });
