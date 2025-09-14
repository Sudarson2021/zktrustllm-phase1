
# Phase 2 Starter Pack — zktrustllm-phase1

This pack gives you end-to-end **LLM KPI evaluation → on-chain reputation** in your local Hardhat setup.

## 0) Prereqs
- Node.js 18 LTS (use `nvm use 18`)
- `npm i -g hardhat` (or just use local `npx hardhat`)
- Python 3.10+ and `pip install -r requirements.txt`
- A local Hardhat node: `npx hardhat node`

## 1) Drop-in to your repo
Copy the contents of this pack into your repo root, keeping paths:
```
contracts/LLMReputation.sol
scripts/deploy_phase2.js
scripts/submit_scores.js
scripts/eval_phase2.py
data/sample_llmq.jsonl
requirements.txt
```
Commit on a feature branch:
```
git checkout -b phase2-kpi
git add .
git commit -m "Phase 2: on-chain LLM reputation MVP"
```

## 2) Compile & deploy
In one terminal:
```
npx hardhat node
```
In another terminal (new shell):
```
npx hardhat compile
npx hardhat run scripts/deploy_phase2.js --network localhost
```
Copy the printed **LLMReputation** contract address for the next step.

## 3) Evaluate KPIs (offline, from dataset)
```
python3 scripts/eval_phase2.py --data data/sample_llmq.jsonl --outdir outputs
# Optional: human scores
# python3 scripts/eval_phase2.py --data your_dataset.jsonl --human human_feedback.csv --outdir outputs
```
Artifacts:
- `outputs/model_kpis.csv`
- `outputs/aggregated_scores.json` (for chain)
- `outputs/plots/*.png` (EM, semantic similarity, autoScore)

## 4) Push scores on-chain
```
# Replace <ADDR> with the one printed at deploy time
npx hardhat run --no-compile scripts/submit_scores.js --network localhost -- <ADDR> outputs/aggregated_scores.json
```
You can then read reputations in a Hardhat console:
```
npx hardhat console --network localhost
> const c = await ethers.getContractAt("LLMReputation", "<ADDR>")
> (await c.reputation(1)).toString()
```

## 5) Where to plug your **real** Phase 2 data
- Replace `data/sample_llmq.jsonl` with your dataset like **LLMGooAQ.jsonl** (has columns for models).
- Provide optional `--human human_feedback.csv` to blend in human evaluation (0..100 scale).

## 6) Paper‑ready KPIs (suggested)
- **Accuracy (EM)**, **ROUGE‑L**, **BLEU**, **Semantic Similarity**
- **On‑chain metrics:** gas per submission, time to finality, write TPS (local)
- **Decay behavior:** replicate decayed reputation over days (set `setDecayBpsPerDay` and re-read `reputation()`)

## 7) Notes
- The contract uses a single **oracle** (2nd signer in localhost) to post scores.
- Evidence field can point to IPFS (CSV/plots tarball) once you pin your outputs.
- This MVP avoids external oracles; integrate Chainlink later if desired.
