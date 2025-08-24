const ReputationWithZK = artifacts.require("ReputationWithZK");

function userArgs() {
  const i = process.argv.indexOf("--");
  return i >= 0 ? process.argv.slice(i + 1) : [];
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
    const count = (await rep.feedbackCount(model)).toNumber();
    console.log("Model:", model);
    console.log("feedbackCount:", count);

    for (let i = 0; i < count; i++) {
      const fb = await rep.feedbacks(model, i);
      const ts = Number(fb.timestamp);
      console.log(
        `#${i}  scoreHash=${fb.scoreHash}  user=${fb.user}  ts=${new Date(ts * 1000).toISOString()}`
      );
    }
    cb();
  } catch (e) { console.error(e); cb(e); }
};
