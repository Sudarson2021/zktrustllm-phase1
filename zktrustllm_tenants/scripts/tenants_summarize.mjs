// scripts/tenants_summarize.mjs
import fs from "fs";
import path from "path";

function p(arr, q) {
  if (arr.length === 0) return 0;
  const a = [...arr].sort((x,y)=>x-y);
  const idx = Math.max(0, Math.min(a.length-1, Math.floor((a.length-1)*q)));
  return a[idx];
}
function mean(arr) { return arr.length ? arr.reduce((s,x)=>s+x,0)/arr.length : 0; }

const base = path.dirname(new URL(import.meta.url).pathname);
const file = path.join(base, "tenants_results.ndjson");
if (!fs.existsSync(file)) { console.error("Missing", file); process.exit(1); }

const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
const recs = lines.map(l => JSON.parse(l));

const latAll = recs.map(r => r.latency_ms);
const gasAll = recs.map(r => Number(r.gasUsed));
console.log("OVERALL", JSON.stringify({ count: recs.length, p50_ms: p(latAll,0.5), p95_ms: p(latAll,0.95), gas_mean: Math.round(mean(gasAll)) }));

const byTenant = {};
for (const r of recs) (byTenant[r.tenant] = byTenant[r.tenant] || []).push(r);
for (const [tenant, arr] of Object.entries(byTenant)) {
  const lat = arr.map(r => r.latency_ms);
  const gas = arr.map(r => Number(r.gasUsed));
  console.log("TENANT", JSON.stringify({ tenant, count: arr.length, p50_ms: p(lat,0.5), p95_ms: p(lat,0.95), gas_mean: Math.round(mean(gas)) }));
}
