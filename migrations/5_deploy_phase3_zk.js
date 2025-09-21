const V3ZK     = artifacts.require("LLMReputationV3ZK");
const Verifier = artifacts.require("Groth16Verifier"); // from contracts/Verifier_groth16.sol

module.exports = async (deployer, network, accounts) => {
  const admin  = accounts[0];
  const oracle = accounts[1];

  await deployer.deploy(Verifier);
  const verifier = await Verifier.deployed();

  await deployer.deploy(V3ZK, admin, oracle, verifier.address);
  console.log("Groth16Verifier ->", verifier.address);
  console.log("LLMReputationV3ZK ->", (await V3ZK.deployed()).address);
};
