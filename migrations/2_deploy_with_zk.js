const AlwaysTrueVerifier = artifacts.require("AlwaysTrueVerifier");
const ReputationWithZK = artifacts.require("ReputationWithZK");

module.exports = async function (deployer) {
  await deployer.deploy(AlwaysTrueVerifier);
  const ver = await AlwaysTrueVerifier.deployed();
  await deployer.deploy(ReputationWithZK, ver.address);
};
