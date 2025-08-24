const ReputationWithZK = artifacts.require("ReputationWithZK");

function userArgs() {
  const sep = process.argv.indexOf('--');
  return sep >= 0 ? process.argv.slice(sep + 1) : [];
}

module.exports = async function (cb) {
  try {
    const rep = await ReputationWithZK.deployed();
    const accts = await web3.eth.getAccounts();

    const args = userArgs();
    const idx = args[0] !== undefined ? Number(args[0]) : 2;
    if (!Number.isInteger(idx) || idx < 0 || idx >= accts.length)
      throw new Error(`Model index out of range. Got "${args[0]}"`);

    const model = accts[idx];
    console.log("Model:", model);
    console.log("feedbackCount:", (await rep.feedbackCount(model)).toString());
    console.log("reputationSum:", (await rep.reputationSum(model)).toString());
    console.log("average x100:", (await rep.getAverage(model)).toString());
    cb();
  } catch (e) {
    console.error(e);
    cb(e);
  }
};
