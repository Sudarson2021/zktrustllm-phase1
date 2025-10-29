import fs from "fs";
import readline from "readline";
import pLimit from "p-limit";
const { default: OpenAI } = await import("openai");

const MODEL = process.env.MODEL || "gpt-4o-mini";
const DATA  = process.env.DATA || "data/mmlu_dev.jsonl";
const OUT   = process.env.OUT  || "outputs_openai/mmlu_answers.jsonl";
fs.mkdirSync("outputs_openai",{recursive:true});
if (!process.env.OPENAI_API_KEY) { console.error("Set OPENAI_API_KEY"); process.exit(1); }

const letters = ["A","B","C","D","E","F"];
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rl = readline.createInterface({ input: fs.createReadStream(DATA), crlfDelay: Infinity });
const limit = pLimit(2);
const out = fs.createWriteStream(OUT, { flags:"w" });

function mcPrompt(q, options) {
  const opts = options.map((o,i)=>`${letters[i]}) ${o.replace(/^[A-F]\)\s*/,'').trim()}`).join("\n");
  return [
    { role:"system", content:"Answer ONLY with one capital letter from the option set (A, B, C, D, ...). No words."},
    { role:"user", content:`Question:\n${q}\n\nOptions:\n${opts}\n\nAnswer with a single letter from [${letters.slice(0,options.length).join(", ")}].` }
  ];
}
async function ask(messages) {
  const r = await client.chat.completions.create({ model: MODEL, messages });
  return r.choices[0]?.message?.content?.trim() ?? "";
}
function extractLetter(s, K) {
  const m = s.match(/^[A-F]/); if (m && letters.indexOf(m[0]) < K) return m[0];
  for (const L of letters.slice(0,K)) if (s.includes(L)) return L;
  return null;
}

let n=0; const jobs=[];
for await (const line of rl) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  const K = row.options?.length || 0;
  jobs.push(limit(async ()=>{
    const msg = mcPrompt(row.question, row.options);
    let raw = await ask(msg); let L = extractLetter(raw, K);
    if (!L) { // one retry with even harsher instruction
      const msg2 = [...msg];
      msg2[0] = { role:"system", content:"Your entire output MUST be exactly 1 character in {A,B,C,D,E,F}. No explanation." };
      raw = await ask(msg2); L = extractLetter(raw, K) || letters[0]; // fail-closed default A
    }
    out.write(JSON.stringify({ id: row.id, question: row.question, options: row.options, answer_model: L, gold: row.gold })+"\n");
    n++;
  }));
}
await Promise.all(jobs);
out.end();
console.log(`Wrote ${n} answers -> ${OUT}`);
