import OpenAI from "openai";

const MODELS = (process.env.MODELS || "gpt-5").split(",").map(s=>s.trim()).filter(Boolean);
const RUNS = parseInt(process.env.RUNS || "3", 10);
const PROMPT = process.env.PROMPT || "Answer in one sentence: why use zero-knowledge proofs?";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  project: process.env.OPENAI_PROJECT || undefined,
});

function nowIso(){ return new Date().toISOString(); }

async function once(model) {
  const t0 = Date.now();
  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: PROMPT }],
  });
  const dt = Date.now() - t0;
  const u = resp.usage || {};
  return {
    ts: nowIso(),
    model,
    latency_ms: dt,
    prompt_tokens: u.prompt_tokens ?? null,
    completion_tokens: u.completion_tokens ?? null,
    total_tokens: u.total_tokens ?? null,
    preview: resp.choices?.[0]?.message?.content?.slice(0, 120) ?? ""
  };
}

(async () => {
  for (const m of MODELS) {
    for (let i=0;i<RUNS;i++) {
      try {
        const r = await once(m);
        console.log(JSON.stringify(r));
      } catch (e) {
        console.log(JSON.stringify({ ts: nowIso(), model: m, error: String(e) }));
      }
    }
  }
})();
