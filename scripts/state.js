const ReputationWithZK = artifacts.require("ReputationWithZK");
module.exports = async function (cb) {
  try {
    const rep = await ReputationWithZK.deployed();
    const accts = await web3.eth.getAccounts();
    const model = accts[2];
    console.log("Model:", model);
    console.log("feedbackCount:", (await rep.feedbackCount(model)).toString());
    console.log("reputationSum:", (await rep.reputationSum(model)).toString());
    console.log("average x100:", (await rep.getAverage(model)).toString());
    cb();
  } catch (e){ console.error(e); cb(e); }
};
