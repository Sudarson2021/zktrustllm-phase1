const L = artifacts.require("LLMReputation");

module.exports = async function (cb) {
  try {
    const addr = process.env.CONTRACT;
    if (!addr) throw new Error("Set CONTRACT=<address> env var.");
    const llm = await L.at(addr);

    for (let id = 1; id <= 3; id++) {
      let printed = false;
      if (llm.getModel) {
        try {
          const r = await llm.getModel(id);
          console.log("getModel(", id, ") =>", r);
          printed = true;
        } catch {}
      }
      if (!printed && llm.models) {
        try {
          const r = await llm.models(id);
          console.log("models(", id, ") =>", r);
          printed = true;
        } catch {}
      }
      if (!printed) {
        // Try separate getters if present
        let name, owner;
        try { if (llm.modelName)  name  = await llm.modelName(id); } catch {}
        try { if (llm.modelOwner) owner = await llm.modelOwner(id); } catch {}
        if (name !== undefined || owner !== undefined) {
          console.log(`id ${id} -> name=${name} owner=${owner}`);
          printed = true;
        }
      }
      if (!printed) console.log(`id ${id}: no known getter found`);
    }

    cb();
  } catch (e) { cb(e); }
};
