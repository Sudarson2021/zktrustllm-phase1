const LLMReputation = artifacts.require("LLMReputation");

module.exports = async function (deployer, network, accounts) {
  const oracle = accounts[1];                    // admin/oracle
  await deployer.deploy(LLMReputation, oracle);
  const llm = await LLMReputation.deployed();
  console.log("LLMReputation (Truffle) ->", llm.address);

  // ABI shows: registerModel(uint256 modelId, string name, address owner)
  await llm.registerModel(1, "Model_1", accounts[1]);
  await llm.registerModel(2, "Model_2", accounts[2]);
  await llm.registerModel(3, "Model_3", accounts[3]);
  console.log("Registered models:", accounts[1], accounts[2], accounts[3]);
};
