const fs = require("fs");
const path = process.argv.includes("--file") ? process.argv[process.argv.indexOf("--file")+1] : null;
if (!path) { console.error("Usage: node scripts/score_contains.js --file <answers.jsonl>"); process.exit(1); }
const norm = s => String(s||"").toLowerCase().replace(/\s+/g,' ').trim();
let total=0, correct=0;
for (const line of fs.readFileSync(path, "utf8").trim().split(/\r?\n/)) {
  if (!line) continue;
  const r = JSON.parse(line);
  if (!r.gold) continue;
  total++;
  correct += norm(r.answer_model).includes(norm(r.gold)) ? 1 : 0;
}
const acc = total ? (100 * correct / total) : 0;
console.log(JSON.stringify({ total, correct, contains_percent: acc.toFixed(2) }, null, 2));
