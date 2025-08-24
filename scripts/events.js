const ReputationWithZK = artifacts.require("ReputationWithZK");

module.exports = async function (cb) {
  try {
    const rep = await ReputationWithZK.deployed();
    const events = await rep.getPastEvents("FeedbackSubmitted", {
      fromBlock: 0,
      toBlock: "latest",
    });
    console.log(`Found ${events.length} FeedbackSubmitted events`);
    for (const ev of events) {
      const { model, user, scoreHash } = ev.returnValues;
      console.log(`block=${ev.blockNumber} tx=${ev.transactionHash}`);
      console.log(`  model=${model}`);
      console.log(`  user=${user}`);
      console.log(`  scoreHash=${scoreHash}\n`);
    }
    cb();
  } catch (e) { console.error(e); cb(e); }
};
