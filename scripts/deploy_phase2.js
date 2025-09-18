// scripts/deploy_phase2.js (ethers v6)
const hre = require("hardhat");

async function main() {
  const [deployer, oracle] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Oracle  :", oracle.address);

  const LLMReputation = await hre.ethers.getContractFactory("LLMReputation");
  const c = await LLMReputation.deploy(oracle.address);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log("LLMReputation deployed to:", addr);

  // Register a few example models
  await (await c.registerModel(1, "vicuna-13b-v1.3", deployer.address)).wait();
  await (await c.registerModel(2, "llama-2-13b", deployer.address)).wait();
  await (await c.registerModel(3, "alpaca-13b", deployer.address)).wait();
  console.log("Registered models 1..3");
}
main().catch((e) => { console.error(e); process.exit(1); });
