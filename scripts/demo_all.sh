#!/usr/bin/env bash
set -euo pipefail

# ---- config ----
MODEL=${MODEL:-gpt-4o-mini}
MCQ_DATA=${MCQ_DATA:-data/mmlu_dev.jsonl}
MCQ_OUT=${MCQ_OUT:-outputs_openai/mmlu_answers.jsonl}
EVIDENCE=${EVIDENCE:-outputs_openai/evidence_openai.json}
RATING=${RATING:-82}        # set from scorer output
WEIGHT=100                  # contract requires 100
NETWORK=${NETWORK:-localhost}

echo "==[1] Generate MCQ answers with $MODEL =="
MODEL=$MODEL DATA=$MCQ_DATA OUT=$MCQ_OUT node scripts/gen_mcq_openai.mjs

echo "==[2] Score MCQ =="
node scripts/score_mcq.js --file $MCQ_OUT

echo "==[3] Build data manifest & evidence =="
node scripts/build_data_manifest.mjs data
node scripts/build_provenance.mjs model=$MODEL dataset=$MCQ_DATA answers=$MCQ_OUT metric=accuracy out=$EVIDENCE

echo "==[4] IPFS add evidence =="
CID=$(ipfs add -q $EVIDENCE | tail -1)
echo "CID=$CID"
curl -s http://127.0.0.1:8081/ipfs/$CID >/dev/null || true

echo "==[5] ZK submit (Phase 5) =="
RATING=$RATING WEIGHT=$WEIGHT EVIDENCE=$EVIDENCE npx hardhat run scripts/zk_submit_with_evidence.js --network $NETWORK

echo "==[6] Report =="
npx hardhat run scripts/report.js --network $NETWORK
echo "Done."
