const fs = require("fs");
const path = "outputs_openai";
const rows = [];
for (const f of fs.readdirSync(path)) {
  if (!/evidence_.*\.json$/.test(f)) continue;
  const e = JSON.parse(fs.readFileSync(`${path}/${f}`,"utf8"));
  let score = "n/a";
  try {
    if (e.metric === "accuracy") {
      const txt = fs.readFileSync(e.answers_file,"utf8").trim();
      let total=0, correct=0;
      txt.split(/\r?\n/).forEach(l => { const r=JSON.parse(l); if(r.gold){ total++; if(String(r.answer_model).toUpperCase()===String(r.gold).toUpperCase()) correct++; }});
      score = total? (100*correct/total).toFixed(2):"0.00";
    } else if (e.judge_file) {
      const txt = fs.readFileSync(e.judge_file,"utf8").trim();
      let n=0, s=0;
      txt.split(/\r?\n/).forEach(l=>{const r=JSON.parse(l); if(r.judge_score!=null){ s+=+r.judge_score; n++; }});
      score = n ? (s/n).toFixed(2) : "0.00";
    }
  } catch {}
  rows.push({ model:e.model, metric:e.metric, dataset:e.dataset, answers:e.answers_file, judge:e.judge_file||"", score });
}
rows.sort((a,b)=>+b.score - +a.score);
let md = `| Model | Metric | Dataset | Score |\n|---|---|---:|---:|\n`;
for (const r of rows) md += `| ${r.model} | ${r.metric}${r.judge?" (judge)":""} | ${r.dataset} | ${r.score} |\n`;
fs.writeFileSync("LEADERBOARD.md", md);
console.log("Wrote LEADERBOARD.md"); 
