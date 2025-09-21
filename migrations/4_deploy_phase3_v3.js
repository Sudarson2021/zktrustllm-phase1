const V3 = artifacts.require("LLMReputationV3");
module.exports = async (deployer, network, accounts) => {
  const admin  = accounts[0];
  const oracle = accounts[1];
  await deployer.deploy(V3, admin, oracle);
  const v3 = await V3.deployed();
  console.log("LLMReputationV3 ->", v3.address);
};
