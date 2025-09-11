module.exports = async function (callback) {
  try {
    const Reputation = artifacts.require("ReputationWithZK");
    const instance = await Reputation.deployed();
    const evs = await instance.getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' });
    if (evs.length === 0) { console.log("(no events)"); }
    evs.forEach(ev => console.log(`#${ev.blockNumber} ${ev.event} →`, ev.returnValues));
  } catch (e) { console.error(e); }
  callback();
}
