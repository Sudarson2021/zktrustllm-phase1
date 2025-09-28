const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const VerifierMock = await hre.ethers.getContractFactory("contracts/VerifierMock.sol:VerifierMock");
  const verifier = await VerifierMock.deploy(true); await verifier.waitForDeployment();
  const LLM = await hre.ethers.getContractFactory("LLMReputationV3ZK");
  const llm = await LLM.deploy(await deployer.getAddress(), await deployer.getAddress(), await verifier.getAddress());
  await llm.waitForDeployment();
  console.log("LLM:", await llm.getAddress());
}
main().catch((e)=>{ console.error(e); process.exit(1); });
