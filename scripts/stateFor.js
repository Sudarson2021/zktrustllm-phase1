module.exports = async function (callback) {
  try {
    const Reputation = artifacts.require("ReputationWithZK");
    const instance = await Reputation.deployed();
    const accounts = await web3.eth.getAccounts();
    const arg = process.argv[process.argv.length - 1];
    const idx = isNaN(parseInt(arg)) ? 2 : parseInt(arg);
    const model = accounts[idx];
    const feedbackCount = await instance.feedbackCount(model);
    const reputationSum = await instance.reputationSum(model);
    const averageX100   = await instance.getAverage(model);
    console.log("Model:", model);
    console.log("feedbackCount:", feedbackCount.toString());
    console.log("reputationSum:", reputationSum.toString());
    console.log("average x100:", averageX100.toString());
  } catch (e) { console.error(e); }
  callback();
}
