const fs = require("fs");
const path = require("path");
const L = artifacts.require("LLMReputation");
const toB32 = (s) => web3.utils.rightPad(web3.utils.asciiToHex(s), 66);

module.exports = async function (cb) {
  try {
    const addr = process.env.CONTRACT;
    if (!addr) throw new Error("Set CONTRACT=<address> env var.");
    const jsonArg = process.argv.find(a => a.endsWith(".json"));
    if (!jsonArg) throw new Error("Usage: CONTRACT=<addr> truffle exec scripts/register_any_metric.js -- kpis/sample_kpi.json");

    const p = JSON.parse(fs.readFileSync(path.resolve(jsonArg), "utf8"));
    const modelId = 1;  // change to 2 or 3 if you prefer
    const metric   = Object.keys(p.metrics || { accuracy: 0.918 })[0];
    const valueF   = (p.metrics && p.metrics[metric]) || 0.918;
    const valueBps = Math.round(valueF * 10000);
    const uri      = "ipfs://demo-evidence";

    const llm = await L.at(addr);
    const abi = llm.abi || llm.contract._jsonInterface;
    const fns = abi.filter(x => x.type==="function" && /(kpi|metric|score|feedback|submit)/i.test(x.name));

    const wanted = [
      ["uint256","string","uint256","string"], // (modelId, metricName, valueBps, uri)
      ["uint256","string","uint256"],          // (modelId, metricName, valueBps)
      ["uint256","bytes32","uint256","string"],
      ["uint256","bytes32","uint256"],
      ["uint256","uint256","bool"],            // (modelId, value, reveal)
      ["uint256","uint256","string"],          // (modelId, value, uri)
      ["uint256","uint256"]                    // (modelId, value)
    ];

    const buildArgs = (types) => {
      const t = types.join(",");
      switch (t) {
        case "uint256,string,uint256,string":   return [modelId, metric, valueBps, uri];
        case "uint256,string,uint256":          return [modelId, metric, valueBps];
        case "uint256,bytes32,uint256,string":  return [modelId, toB32(metric), valueBps, uri];
        case "uint256,bytes32,uint256":         return [modelId, toB32(metric), valueBps];
        case "uint256,uint256,bool":            return [modelId, valueBps, true];
        case "uint256,uint256,string":          return [modelId, valueBps, uri];
        case "uint256,uint256":                 return [modelId, valueBps];
        default: return null;
      }
    };

    const accounts = await web3.eth.getAccounts();
    for (const fn of fns) {
      const types = fn.inputs.map(i=>i.type);
      if (!wanted.some(w => w.join(",") === types.join(","))) continue;
      const args = buildArgs(types);
      if (!args) continue;

      console.log("Trying:", fn.name, "(", types.join(", "), ")", "args=", args);
      try {
        const tx = await llm[fn.name](...args, { from: accounts[0] });
        console.log(`OK: ${fn.name} -> tx:`, tx.tx || tx.receipt?.transactionHash);
        return cb();
      } catch (e) {
        console.log(`Failed ${fn.name}:`, e.message);
      }
    }

    console.log("No matching KPI/score/feedback function found (or all attempts failed).");
    cb();
  } catch (e) { cb(e); }
};
