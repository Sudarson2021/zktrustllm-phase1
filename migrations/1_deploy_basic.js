const ReputationBasic = artifacts.require("ReputationBasic");
module.exports = async function (deployer) {
  await deployer.deploy(ReputationBasic);
};
