import fs from "fs";

const file = process.argv[2] || "outputs_openai/bench.ndjson";
const lines = fs.readFileSync(file, "utf8").trim().split("\n");
const rows = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const byModel = {};
for (const r of rows) {
  (byModel[r.model] ||= []).push(r);
}

function quantile(arr, q) {
  if (!arr.length) return null;
  const a = arr.slice().sort((x,y)=>x-y);
  const idx = (a.length-1)*q;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo===hi) return a[lo];
  return a[lo] + (a[hi]-a[lo])*(idx-lo);
}

const out = Object.fromEntries(Object.entries(byModel).map(([m, arr]) => {
  const good = arr.filter(x => !x.error);
  const lat = good.map(x => x.latency_ms);
  const pt = good.map(x => x.prompt_tokens || 0);
  const ct = good.map(x => x.completion_tokens || 0);
  const tt = good.map(x => x.total_tokens || 0);
  const avg = a => a.length ? (a.reduce((s,v)=>s+v,0)/a.length) : null;

  return [m, {
    runs: arr.length,
    ok: good.length,
    latency_ms: { p50: quantile(lat,0.5), p95: quantile(lat,0.95), mean: avg(lat) },
    tokens: {
      prompt_mean: avg(pt), completion_mean: avg(ct), total_mean: avg(tt)
    }
  }];
}));

console.log(JSON.stringify(out, null, 2));
