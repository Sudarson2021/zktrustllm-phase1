const fs = require("fs");
const path = require("path");
const L = artifacts.require("LLMReputation");

module.exports = async function (cb) {
  try {
    const addr = process.env.CONTRACT;
    if (!addr) throw new Error("Set CONTRACT=<address> env var.");
    const jsonArg = process.argv.find(a => a.endsWith(".json"));
    if (!jsonArg) throw new Error("Usage: CONTRACT=<addr> truffle exec scripts/register_kpi_payload_truffle.js -- kpis/sample_kpi.json");

    const payload = JSON.parse(fs.readFileSync(path.resolve(jsonArg), "utf8"));

    // Demo inputs derived from payload
    const modelId = 1; // change if you want 2 or 3
    const metric = Object.keys(payload.metrics || { accuracy: 0.918 })[0];
    const valueFloat = (payload.metrics && payload.metrics[metric]) || 0.918;
    const valueBps = Math.round(valueFloat * 10000); // 0.918 -> 9180 basis points
    const uri = "ipfs://demo-evidence";              // replace with real CID if you have one

    const llm = await L.at(addr);
    const abi = llm.abi || llm.contract._jsonInterface;

    const candidates = [
      { name: "recordKpi",    args: [modelId, metric, valueBps, uri] },
      { name: "recordKPI",    args: [modelId, metric, valueBps, uri] },
      { name: "recordMetric", args: [modelId, metric, valueBps, uri] },
      { name: "setKpi",       args: [modelId, metric, valueBps, uri] },
      { name: "setMetric",    args: [modelId, metric, valueBps, uri] },
      // fallback score-style:
      { name: "submitScore",  args: [modelId, valueBps, true] },
      { name: "addFeedback",  args: [modelId, valueBps, true] },
      { name: "recordScore",  args: [modelId, valueBps, true] }
    ];

    const accounts = await web3.eth.getAccounts();
    let ok = false;
    for (const c of candidates) {
      const exists = abi.some(f => f.type === "function" && f.name === c.name && f.inputs.length === c.args.length);
      if (!exists) continue;
      console.log("Trying:", c.name, "args=", c.args);
      try {
        const tx = await llm[c.name](...c.args, { from: accounts[0] });
        console.log(`OK: ${c.name} -> tx:`, tx.tx || tx.receipt?.transactionHash);
        ok = true; break;
      } catch (e) {
        console.log(`Failed ${c.name}:`, e.message);
      }
    }
    if (!ok) console.log("No matching KPI/score function found on this contract.");
    cb();
  } catch (e) { cb(e); }
};
