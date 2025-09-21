const fs = require("fs");
const path = require("path");
const L = artifacts.require("LLMReputation");

// clamp to basis points (0..10000)
function toBps(x){const n=Number(x);if(!isFinite(n))return 0;const b=Math.round(n*10000);return Math.min(Math.max(b,0),10000);}

// Parse args: prefer ENV (MODEL, KPI_JSON); else CLI:
//   truffle exec ... -- <modelId> <jsonPath>
//   truffle exec ... -- <modelId> <s1> <s2> <s3> [uri]
function getUserArgs(){
  const envModel = process.env.MODEL || process.env.MODEL_ID;
  const envJson  = process.env.KPI_JSON;
  const ix = process.argv.findIndex(a => a.endsWith("scripts/submit_scores_truffle.js"));
  const raw = ix>=0?process.argv.slice(ix+1):process.argv.slice(2);
  const dd  = raw.indexOf("--");
  const user = dd>=0?raw.slice(dd+1):raw;

  if (envModel && envJson) return { kind:"json", modelId:parseInt(envModel,10), jsonPath:envJson };

  const jx = user.findIndex(a => a.endsWith(".json"));
  if (jx !== -1) return { kind:"json", modelId:parseInt(user[0]||"1",10), jsonPath:user[jx] };

  if (user.length >= 4) {
    const [m,s1,s2,s3,uri] = user;
    return { kind:"numbers", modelId:parseInt(m,10), s1:Number(s1), s2:Number(s2), s3:Number(s3), uri };
  }
  throw new Error("Usage:\n  (A) ENV: MODEL=1 KPI_JSON=kpis/sample_kpi.json CONTRACT=<addr> truffle exec scripts/submit_scores_truffle.js --network development\n  (B) CLI JSON: CONTRACT=<addr> truffle exec scripts/submit_scores_truffle.js --network development -- 1 kpis/sample_kpi.json\n  (C) CLI NUMS: CONTRACT=<addr> truffle exec scripts/submit_scores_truffle.js --network development -- 1 9180 9030 9880 \"uri\"");
}

module.exports = async function (cb){
  try{
    const addr = process.env.CONTRACT;
    if(!addr) throw new Error("Set CONTRACT=<address> env var.");
    const llm = await L.at(addr);

    const cfg = getUserArgs();
    let modelId, s1, s2, s3, uri;

    if (cfg.kind === "json") {
      const p = JSON.parse(fs.readFileSync(path.resolve(cfg.jsonPath), "utf8"));
      const m = p.metrics || {};
      const acc = m.accuracy ?? 0.9;
      const f1  = m.macro_f1 ?? m.f1 ?? 0.9;
      const tox = m.toxicity_rate ?? 0.05;           // lower is better
      const safety = 1 - Number(tox);                // invert to safety
      modelId = cfg.modelId;
      s1 = toBps(acc); s2 = toBps(f1); s3 = toBps(safety);
      uri = p.uri || `dataset:${p.dataset || "unknown"};note:${(p.notes||"").slice(0,80)}`;
    } else {
      modelId = cfg.modelId;
      s1 = toBps(cfg.s1); s2 = toBps(cfg.s2); s3 = toBps(cfg.s3);
      uri = cfg.uri || "ipfs://demo";
    }

    if (!Number.isInteger(modelId)) throw new Error("modelId must be an integer");

    // 🔑 submit from the on-chain oracle
    const oracle = await llm.oracle();
    console.log("Oracle:", oracle);
    console.log("Submitting submitScores(", modelId, s1, s2, s3, uri, ") from oracle…");
    const tx = await llm.submitScores(modelId, s1, s2, s3, uri, { from: oracle });
    console.log("Tx:", tx.tx || tx.receipt?.transactionHash);
    cb();
  } catch(e){ cb(e); }
}
