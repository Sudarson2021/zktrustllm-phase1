// scripts/deploy_phase2.js
// Usage: npx hardhat run scripts/deploy_phase2.js --network localhost
const hre = require("hardhat");
async function main() {
  const [deployer, oracle] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Oracle  :", oracle.address);

  const LLMReputation = await hre.ethers.getContractFactory("LLMReputation");
  const c = await LLMReputation.deploy(oracle.address);
  await c.deployed();
  console.log("LLMReputation deployed to:", c.address);

  // Register a few models (IDs are arbitrary; align with your evaluator output)
  const tx1 = await c.registerModel(1, "vicuna-13b-v1.3", deployer.address);
  const tx2 = await c.registerModel(2, "llama-2-13b", deployer.address);
  const tx3 = await c.registerModel(3, "alpaca-13b", deployer.address);
  await tx1.wait(); await tx2.wait(); await tx3.wait();
  console.log("Registered models 1..3");
}
main().catch((e) => { console.error(e); process.exit(1); });
