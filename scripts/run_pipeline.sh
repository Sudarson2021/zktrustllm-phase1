#!/usr/bin/env bash
set -euo pipefail

# ---- Config via env (defaults) ----------------------------------------------
: "${MODELS:=gpt-5,gpt-4o-mini}"
: "${RUNS:=5}"
: "${PROMPT:=Answer in one sentence: why use zero-knowledge proofs?}"
: "${MODEL_ADDR:=}"
: "${OPENAI_PROJECT:=}"

# ---- Sanity: local node up? -------------------------------------------------
if ! curl -sf http://127.0.0.1:8545 >/dev/null; then
  echo "Hardhat node is not running on 127.0.0.1:8545. Start it in Terminal A:"
  echo "  npx hardhat node"
  exit 1
fi

# ---- ALWAYS (re)deploy to avoid stale addresses -----------------------------
echo "Deploying local contracts..."
rm -f scripts/.addr.localhost.json
npx hardhat run scripts/deploy_local.js --network localhost

mkdir -p outputs_openai
: > outputs_openai/bench.ndjson

echo "Running benchmarks for MODELS=${MODELS} RUNS=${RUNS} ..."
MODELS="${MODELS}" RUNS="${RUNS}" PROMPT="${PROMPT}" \
  node scripts/bench_many.mjs >> outputs_openai/bench.ndjson

# CSV + Markdown
node scripts/bench_to_csv.mjs  outputs_openai/bench.ndjson outputs_openai/bench.csv
node scripts/report_markdown.mjs outputs_openai/bench.ndjson outputs_openai/bench_report.md
# Ask GPT-5 to grade & emit evidence text
echo "Scoring with GPT-5..."
RES=$(node scripts/openai_score.mjs)  # uses MODEL=gpt-5 by default
RATING=$(echo "$RES" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).rating))')
EVIDENCE_FILE=$(echo "$RES" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).evidence_file))')
echo "Rating: ${RATING} | Evidence: ${EVIDENCE_FILE}"

# Submit on-chain
echo "Submitting on-chain..."
MODEL_ADDR="${MODEL_ADDR}" RATING="${RATING}" EVIDENCE_FILE="${EVIDENCE_FILE}" \
  npx hardhat run scripts/submit_rating_from_text.js --network localhost

# Read stats
echo "Reading on-chain stats..."
MODEL_ADDR="${MODEL_ADDR}" npx hardhat run scripts/subject_stats.js --network localhost

echo "Done."
echo "Artifacts:"
echo "  - outputs_openai/bench.ndjson"
echo "  - outputs_openai/bench.csv"
echo "  - outputs_openai/bench_report.md"
