import fs from "fs";
import readline from "readline";
const { default: OpenAI } = await import("openai");

const MODEL = process.env.JUDGE_MODEL || "gpt-4o-mini";
const IN    = process.env.IN   || "outputs_openai/squad_answers.jsonl";
const OUT   = process.env.OUT  || "outputs_openai/squad_judged.jsonl";
if (!process.env.OPENAI_API_KEY) { console.error("Set OPENAI_API_KEY"); process.exit(1); }

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const out = fs.createWriteStream(OUT, { flags:"w" });

const rl = readline.createInterface({ input: fs.createReadStream(IN), crlfDelay: Infinity });

function rubricPrompt(row) {
  const gold = row.gold ?? "";
  const ans  = row.answer_model ?? "";
  const q    = row.question ?? "";
  const ctx  = row.context ?? "";
  return [
    { role:"system", content:
`You are a strict grader. Score the candidate answer vs the gold answer with this rubric:
- 100: exactly correct and complete
- 80–99: essentially correct with minor omission/phrasing differences
- 60–79: partially correct; contains a key idea but misses important parts
- 40–59: tangential or weakly related
- 1–39: incorrect
- 0: empty or unrelated

Return JSON ONLY:
{"score": <0..100 integer>, "rationale": "<one sentence>"}`},
    { role:"user", content:
`Question: ${q}
${ctx ? "Context: "+ctx+"\n" : ""}
Gold answer: ${gold}
Candidate answer: ${ans}
JSON only:`}
  ];
}

function extractJSON(s) {
  try { return JSON.parse(s); } catch { 
    const m = s.match(/\{[\s\S]*\}/); 
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return { score: 0, rationale: "parse_error" };
  }
}

let n=0;
for await (const line of rl) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  const r = await client.chat.completions.create({
    model: MODEL, messages: rubricPrompt(row)
  });
  const js = extractJSON(r.choices[0]?.message?.content || "");
  js.score = Math.max(0, Math.min(100, Math.round(js.score ?? 0)));
  out.write(JSON.stringify({ ...row, judge_score: js.score, judge_rationale: js.rationale })+"\n");
  n++;
}
out.end();
console.log(`Judged ${n} items -> ${OUT}`);
