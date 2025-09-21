const L = artifacts.require("LLMReputation");
async function safe(fn, ...args) { try { return await fn(...args); } catch { return undefined; } }

module.exports = async function (cb) {
  try {
    const addr = process.env.CONTRACT;
    if (!addr) throw new Error("Set CONTRACT=<address> env var.");
    const llm = await L.at(addr);

    for (let id = 1; id <= 3; id++) {
      const scores = await safe(llm.scores, id);
      const raw    = await safe(llm.rawScores, id);
      const rep    = await safe(llm.reputation, id);
      console.log(`\nModel ${id}:`);
      if (scores !== undefined) console.log("  scores:", scores);
      if (raw    !== undefined) console.log("  rawScores:", raw);
      if (rep    !== undefined) console.log("  reputation (bps):", rep.toString());
    }

    const decay = await safe(llm.decayBpsPerDay);
    if (decay !== undefined) console.log("\ndecayBpsPerDay:", decay.toString());
    cb();
  } catch (e) { cb(e); }
};
