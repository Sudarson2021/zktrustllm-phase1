const L = artifacts.require("LLMReputation");
module.exports = async function (cb) {
  try {
    const addr = process.env.CONTRACT;
    if (!addr) throw new Error("Set CONTRACT=<address> env var.");
    const llm = await L.at(addr);
    const evs = await llm.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
    if (!evs.length) console.log("No events yet.");
    for (const e of evs) console.log(`[${e.blockNumber}] ${e.event}`, e.returnValues);
    cb();
  } catch (e) { cb(e); }
};
