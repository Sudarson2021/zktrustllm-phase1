import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";

function keccak256(buf){ return "0x"+crypto.createHash("keccak256").update(buf).digest("hex"); }

const args = Object.fromEntries(process.argv.slice(2).map(kv => kv.split("=").map(decodeURIComponent)));

const model     = args.model || process.env.MODEL || "gpt-4o-mini";
const dataset   = args.dataset || "data/mmlu_dev.jsonl";
const answers   = args.answers || "outputs_openai/mmlu_answers.jsonl";
const metric    = args.metric  || "accuracy";
const judgeFile = args.judged  || null;
const outPath   = args.out     || "outputs_openai/evidence_openai.json";

let git = "unknown";
try { git = execSync("git rev-parse HEAD").toString().trim(); } catch {}

const dataManifest = fs.existsSync("data_manifest.json") ? JSON.parse(fs.readFileSync("data_manifest.json","utf8")) : null;

const obj = {
  schema: "zktrustllm/evidence-v1",
  created_at: new Date().toISOString(),
  git_commit: git,
  model,
  inference: { temperature: 0, top_p: 1, stop: null, decode: "letter-only for MCQ; brief sentence for QA" },
  dataset,
  dataset_manifest: dataManifest,
  answers_file: answers,
  metric,
  judge_file: judgeFile,
};

fs.writeFileSync(outPath, JSON.stringify(obj, null, 2));
const h = keccak256(fs.readFileSync(outPath));
console.log("Wrote", outPath, "keccak256:", h);
