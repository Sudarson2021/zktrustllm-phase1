require("dotenv").config?.();
const C = artifacts.require("LLMReputationV3ZK");

module.exports = async function (cb) {
  try {
    const addr = process.env.CONTRACT;
    if (!addr) throw new Error("Set CONTRACT in .env or export it");

    const Z = await C.at(addr);
    const s = await Z.scores(1);
    const evts = await Z.getPastEvents("ScoresSubmittedZK",{fromBlock:0,toBlock:"latest"});

    console.log(JSON.stringify({
      address: Z.address,
      autoScore: s.autoScore.toString(),
      humanScore: s.humanScore.toString(),
      weight: s.weight.toString(),
      evidenceURI: s.evidenceURI,
      events: evts.length
    }, null, 2));
    cb();
  } catch (e) { cb(e); }
}
