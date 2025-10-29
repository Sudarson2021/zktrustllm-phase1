import OpenAI from "openai";

const MODEL = process.env.MODEL || "gpt-5"; // stays GPT-5
const userPrompt = process.env.PROMPT || "Summarize the benefits of ZK proofs in <80 words.";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  project: process.env.OPENAI_PROJECT || undefined,
});

async function main() {
  const start = Date.now();
  const resp = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: userPrompt }],
  });
  const ms = Date.now() - start;
  const choice = resp.choices?.[0]?.message?.content ?? "";
  const usage = resp.usage || {};
  console.log(JSON.stringify({
    model: MODEL,
    latency_ms: ms,
    prompt_tokens: usage.prompt_tokens ?? null,
    completion_tokens: usage.completion_tokens ?? null,
    total_tokens: usage.total_tokens ?? null,
    system_fingerprint: resp.system_fingerprint ?? null,
    preview: choice.slice(0, 120)
  }, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
