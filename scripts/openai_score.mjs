import OpenAI from "openai";
import fs from "fs";

const MODEL = process.env.MODEL || "gpt-5";
const SUBJECT = process.env.SUBJECT || "Model A vs prompt set B";
const PROMPT =
  process.env.PROMPT ||
  "Give a utility score from 0..100 for this model based on helpfulness and correctness across a small test set. Reply ONLY with the integer.";
const GRADE_RUNS = parseInt(process.env.GRADE_RUNS || "5", 10); // votes
const RETRIES = 2; // retry parsing failures

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  project: process.env.OPENAI_PROJECT || undefined,
});
function parseIntStrict(s) {
  const m = String(s || "").match(/(-?\d{1,3})/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n)) return null;
  if (n < 0 || n > 100) return null;
  return n;
}

async function oneGrade() {
  let last = "";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a strict grader. Output ONLY an integer 0..100. No words." },
        { role: "user", content: PROMPT },
      ],
    });
    const text = r.choices?.[0]?.message?.content ?? "";
    last = text;
    const num = parseIntStrict(text);
    if (num !== null) return { num, usage: r.usage || {} };
  }
  const sloppy = parseInt(last, 10);
  const num = Number.isFinite(sloppy) ? Math.max(0, Math.min(100, sloppy)) : 0;
  return { num, usage: {} };
}
const votes = [];
for (let i = 0; i < GRADE_RUNS; i++) {
  const { num } = await oneGrade();
  votes.push(num);
}
votes.sort((a, b) => a - b);
const median = votes[Math.floor(votes.length / 2)];

const evidence = [
  `SUBJECT: ${SUBJECT}`,
  `PROMPT: ${PROMPT}`,
  `MODEL: ${MODEL}`,
  `VOTES: ${JSON.stringify(votes)}`,
  `SCORE: ${median}`,
  `TIMESTAMP: ${new Date().toISOString()}`,
].join("\n");
fs.writeFileSync("outputs_openai/last_evidence.txt", evidence);

console.log(JSON.stringify({ rating: median, votes, evidence_file: "outputs_openai/last_evidence.txt" }, null, 2));
