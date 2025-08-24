const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const Verifier = await hre.ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  const ReputationManager = await hre.ethers.getContractFactory("ReputationManager");
  const rep = await ReputationManager.deploy(await verifier.getAddress(), deployer.address);
  await rep.waitForDeployment();

  console.log("Verifier:", await verifier.getAddress());
  console.log("ReputationManager:", await rep.getAddress());
}
main().catch((e)=>{ console.error(e); process.exit(1); });
