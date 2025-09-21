const fs = require("fs");
const path = require("path");
const L = artifacts.require("LLMReputation");

function toPct(x) {
  const n = Number(x);
  if (!isFinite(n)) return 0;
  const p = Math.round(n * 100);       // 0..100
  return Math.min(Math.max(p, 0), 100);
}

function parseArgs() {
  const ix = process.argv.findIndex(a => a.endsWith("scripts/submit_scores_pct_truffle.js"));
  const raw = ix >= 0 ? process.argv.slice(ix + 1) : process.argv.slice(2);
  const dd  = raw.indexOf("--");
  const args = dd >= 0 ? raw.slice(dd + 1) : raw;

  const envModel = process.env.MODEL || process.env.MODEL_ID;
  const envJson  = process.env.KPI_JSON;

  if (envModel && envJson) return { kind: "json", modelId: parseInt(envModel, 10), jsonPath: envJson };

  const jx = args.findIndex(a => a.endsWith(".json"));
  if (jx !== -1) return { kind: "json", modelId: parseInt(args[0] || "1", 10), jsonPath: args[jx] };

  if (args.length >= 4) {
    const [m, s1, s2, s3, uri] = args;
    return { kind: "numbers", modelId: parseInt(m, 10), s1: Number(s1), s2: Number(s2), s3: Number(s3), uri };
  }

  throw new Error("Usage:\n  (A) ENV: MODEL=1 KPI_JSON=kpis/sample_kpi.json CONTRACT=<addr> truffle exec scripts/submit_scores_pct_truffle.js --network development\n  (B) CLI JSON: CONTRACT=<addr> truffle exec scripts/submit_scores_pct_truffle.js --network development -- 1 kpis/sample_kpi.json\n  (C) CLI NUMS: CONTRACT=<addr> truffle exec scripts/submit_scores_pct_truffle.js --network development -- 1 92 90 99 \"uri\"");
}

module.exports = async function (cb) {
  try {
    const addr = process.env.CONTRACT;
    if (!addr) throw new Error("Set CONTRACT=<address> env var.");

    const llm = await L.at(addr);
    const cfg = parseArgs();

    let modelId, a, h, w, uri;
    if (cfg.kind === "json") {
      const p = JSON.parse(fs.readFileSync(path.resolve(cfg.jsonPath), "utf8"));
      const m = p.metrics || {};
      const acc = m.accuracy ?? 0.9;          // e.g., 0.918
      const f1  = m.macro_f1 ?? m.f1 ?? 0.9;  // e.g., 0.903
      const tox = m.toxicity_rate ?? 0.05;    // lower is better
      const safety = 1 - Number(tox);         // 0.988
      modelId = cfg.modelId;
      a = toPct(acc);
      h = toPct(f1);
      w = toPct(safety);                       // use safety as weight (0..100)
      uri = p.uri || `dataset:${p.dataset || "unknown"};note:${(p.notes || "").slice(0,80)}`;
    } else {
      modelId = cfg.modelId;
      a = Math.max(0, Math.min(100, Math.round(cfg.s1)));
      h = Math.max(0, Math.min(100, Math.round(cfg.s2)));
      w = Math.max(0, Math.min(100, Math.round(cfg.s3)));
      uri = cfg.uri || "ipfs://demo";
    }

    // Submit **from oracle**
    const oracle = await llm.oracle();
    console.log("Oracle:", oracle);
    console.log(`submitScores(model=${modelId}, auto=${a}, human=${h}, weight=${w}, uri=${uri})`);
    const tx = await llm.submitScores(modelId, a, h, w, uri, { from: oracle });
    console.log("Tx:", tx.tx || tx.receipt?.transactionHash);
    cb();
  } catch (e) { cb(e); }
};
