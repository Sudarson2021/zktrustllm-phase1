import fs from "fs";

const file = process.argv[2] || "outputs_openai/bench.ndjson";
const out = process.argv[3] || "outputs_openai/bench_report.md";

const lines = fs.readFileSync(file, "utf8").trim().split("\n")
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean).filter(r => !r.error);

const by = {};
for (const r of lines) (by[r.model] ||= []).push(r);

const q = (arr,q) => {
  if (!arr.length) return null;
  const a = arr.slice().sort((x,y)=>x-y);
  const i=(a.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i);
  return lo===hi ? a[lo] : a[lo]+(a[hi]-a[lo])*(i-lo);
};
const mean = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : null;

let md = `# Model Benchmark Report

_Input_: \`${file}\`  
_Generated_: ${new Date().toISOString()}

| Model | Runs OK | p50 (ms) | p95 (ms) | mean (ms) | Prompt tok (avg) | Completion tok (avg) | Total tok (avg) |
|---|---:|---:|---:|---:|---:|---:|---:|
`;

for (const [model, arr] of Object.entries(by)) {
  const ok = arr.length;
  const lat = arr.map(x=>x.latency_ms);
  const pt = arr.map(x=>x.prompt_tokens||0);
  const ct = arr.map(x=>x.completion_tokens||0);
  const tt = arr.map(x=>x.total_tokens||0);
  md += `| ${model} | ${ok} | ${Math.round(q(lat,0.5))} | ${Math.round(q(lat,0.95))} | ${Math.round(mean(lat))} | ${mean(pt).toFixed(1)} | ${mean(ct).toFixed(1)} | ${mean(tt).toFixed(1)} |\n`;
}

fs.writeFileSync(out, md);
console.log(`wrote ${out}`);
