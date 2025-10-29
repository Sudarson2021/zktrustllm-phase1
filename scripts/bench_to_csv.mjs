import fs from "fs";

const inFile = process.argv[2] || "outputs_openai/bench.ndjson";
const outFile = process.argv[3] || "outputs_openai/bench.csv";

const lines = fs.readFileSync(inFile, "utf8").trim().split("\n")
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean)
  .filter(r => !r.error);

const headers = ["ts","model","latency_ms","prompt_tokens","completion_tokens","total_tokens","preview"];
const esc = s => `"${String(s ?? "").replaceAll(`"`,`""`)}"`;

const rows = [headers.join(",")].concat(
  lines.map(r => [
    r.ts, r.model, r.latency_ms, r.prompt_tokens, r.completion_tokens, r.total_tokens, (r.preview||"").slice(0,80)
  ].map(esc).join(","))
);

fs.writeFileSync(outFile, rows.join("\n"));
console.log(`wrote ${outFile} (${lines.length} rows)`);
