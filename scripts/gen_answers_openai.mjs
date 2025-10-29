import fs from "fs";
import readline from "readline";
import pLimit from "p-limit";

const { default: OpenAI } = await import("openai");

const MODEL = process.env.MODEL || "gpt-4o-mini";
const DATA  = process.env.DATA;
const OUT   = process.env.OUT || "outputs_openai/answers.jsonl";

if (!process.env.OPENAI_API_KEY) { console.error("Set OPENAI_API_KEY"); process.exit(1); }
if (!DATA) { console.error("Set DATA=<path to jsonl>"); process.exit(1); }

fs.mkdirSync(new URL("../outputs_openai/", import.meta.url).pathname, { recursive: true });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rl = readline.createInterface({ input: fs.createReadStream(DATA), crlfDelay: Infinity });
const limit = pLimit(2); // gentle for demos

function mcPrompt(q, options) {
  const letters = ["A","B","C","D","E","F"].slice(0, options.length);
  const opts = options.map((o, i) => {
    // normalize to "A) ..." form for robust rendering
    const txt = o.replace(/^[A-F]\)\s*/,'').trim();
    return `${letters[i]}) ${txt}`;
  }).join("\n");
  return [
    { role: "system", content: "Answer ONLY with the single best letter (A, B, C, D, ...). No explanation." },
    { role: "user", content:
`Question:
${q}

Options:
${opts}

Answer with only one letter from [${letters.join(", ")}].` }
  ];
}

function freeformPrompt(q, context) {
  return [
    { role: "system", content: "You are concise and factual. Answer briefly in one sentence." },
    { role: "user", content: (context && context.length)
        ? `Context:\n${context}\n\nQuestion:\n${q}\n\nAnswer briefly:`
        : `Question:\n${q}\n\nAnswer briefly:` }
  ];
}

async function ask(messages) {
  const resp = await client.chat.completions.create({ model: MODEL, messages });
  return resp.choices[0]?.message?.content?.trim() ?? "";
}

const out = fs.createWriteStream(OUT, { flags: "w" });
let n = 0;
const tasks = [];

for await (const line of rl) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);

  tasks.push(limit(async () => {
    let answer;
    if (row.options && Array.isArray(row.options) && row.options.length > 0) {
      const msg = mcPrompt(row.question, row.options);
      const raw = await ask(msg);
      const letter = (raw.match(/^[A-F]/)?.[0]) ?? raw.replace(/[^A-F]/g,'').charAt(0) ?? raw.trim();
      answer = letter;
    } else {
      const msg = freeformPrompt(row.question, row.context || "");
      answer = await ask(msg);
    }
    out.write(JSON.stringify({
      id: row.id,
      question: row.question,
      options: row.options ?? undefined,
      answer_model: answer,
      gold: row.gold ?? undefined
    }) + "\n");
    n++;
  }));
}

await Promise.all(tasks);
out.end();
console.log(`Wrote ${n} answers -> ${OUT}`);
