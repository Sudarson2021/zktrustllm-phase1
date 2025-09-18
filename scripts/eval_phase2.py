#!/usr/bin/env python3
"""Phase 2 KPI evaluator
- Loads a JSONL dataset with columns:
  id, question, ground_truth_answer, and multiple model columns (e.g., 'vicuna-13b-v1.3', 'llama-2-13b', ...)
- Computes KPIs per model:
  * Exact Match (EM)
  * ROUGE-L
  * BLEU
  * Semantic similarity (sentence-transformers, cosine)
- Aggregates an autoScore (0..100) and writes:
  * outputs/model_kpis.csv
  * outputs/aggregated_scores.json  (for on-chain submission)
  * outputs/plots/*.png
"""
import os, json, math, argparse
from pathlib import Path
import pandas as pd
import numpy as np

# Optional metrics libs (install via requirements.txt)
try:
    from rouge_score import rouge_scorer
except Exception:
    rouge_scorer = None

try:
    import sacrebleu
except Exception:
    sacrebleu = None

# Semantic similarity via sentence-transformers (small model)
ST = None
try:
    from sentence_transformers import SentenceTransformer, util
    ST = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
except Exception:
    ST = None

def normalize_text(s):
    return (s or "").strip().lower()

def exact_match(pred, gold):
    return 1.0 if normalize_text(pred) == normalize_text(gold) else 0.0

def rouge_l(pred, gold):
    if rouge_scorer is None:
        return np.nan
    scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
    score = scorer.score(gold, pred)["rougeL"].fmeasure
    return float(score)

def bleu(pred, gold):
    if sacrebleu is None:
        return np.nan
    return float(sacrebleu.corpus_bleu([pred], [[gold]]).score / 100.0)

def semantic_sim(pred, gold):
    if ST is None:
        return np.nan
    emb = ST.encode([pred, gold], convert_to_tensor=True, normalize_embeddings=True)
    return float(util.cos_sim(emb[0], emb[1]).item())

def compute_kpis(df, model_cols):
    rows = []
    for m in model_cols:
        ems, rls, bls, sims = [], [], [], []
        for _, r in df.iterrows():
            pred = r.get(m, "")
            gold = r.get("ground_truth_answer", "")
            ems.append(exact_match(pred, gold))
            rls.append(rouge_l(pred, gold))
            bls.append(bleu(pred, gold))
            sims.append(semantic_sim(pred, gold))
        # Safe means ignoring NaNs
        EM = np.nanmean(ems) if len(ems) else 0.0
        RL = np.nanmean(rls) if len(rls) else 0.0
        BL = np.nanmean(bls) if len(bls) else 0.0
        SS = np.nanmean(sims) if len(sims) else 0.0

        # AutoScore: weighted blend -> scale to 0..100
        # You can tune weights in paper: e.g., SS 0.6, RL 0.2, BL 0.2 (+EM as a bonus)
        raw = 0.6*SS + 0.2*RL + 0.2*BL
        bonus = 0.1*EM  # small bonus
        autoScore = max(0.0, min(1.0, raw + bonus)) * 100.0

        rows.append({
            "model": m,
            "n_samples": int(len(df)),
            "EM": EM,
            "ROUGE_L": RL,
            "BLEU": BL,
            "SemSim": SS,
            "autoScore_0_100": autoScore,
        })
    return pd.DataFrame(rows)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/sample_llmq.jsonl", help="Path to JSONL dataset")
    ap.add_argument("--outdir", default="outputs", help="Where to write results")
    ap.add_argument("--human", default=None, help="Optional CSV with columns: model,humanScore_0_100")
    ap.add_argument("--evidence", default="ipfs://TODO-CID", help="Evidence URI for plots/CSV")
    args = ap.parse_args()

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)
    df = pd.read_json(args.data, lines=True)

    # Detect model columns (all except known ones)
    known = {"id","question","ground_truth_answer","context"}
    model_cols = [c for c in df.columns if c not in known]
    if not model_cols:
        raise SystemExit("No model columns found in dataset")

    kdf = compute_kpis(df, model_cols)
    kpi_csv = outdir / "model_kpis.csv"
    kdf.to_csv(kpi_csv, index=False)

    # Human scores (optional)
    human_map = {}
    if args.human and os.path.exists(args.human):
        hdf = pd.read_csv(args.human)
        for _, r in hdf.iterrows():
            human_map[str(r["model"]).strip()] = float(r["humanScore_0_100"])

    # Build aggregated scores JSON for chain
    # Assign stable integer IDs for three common models; fall back to hash-based IDs for others.
    name_to_id = {"vicuna-13b-v1.3":1, "llama-2-13b":2, "alpaca-13b":3}
    models_payload = []
    for _, r in kdf.iterrows():
        name = str(r["model"])
        mid = name_to_id.get(name, abs(hash(name)) % (10**6))
        autoScore = float(r["autoScore_0_100"])
        humanScore = float(human_map.get(name, 0.0))
        weight = int(r["n_samples"])
        models_payload.append({
            "modelId": int(mid),
            "name": name,
            "autoScore": int(round(autoScore)),
            "humanScore": int(round(humanScore)),
            "weight": weight,
            "evidenceURI": args.evidence
        })

    payload = {"models": models_payload}
    with open(outdir / "aggregated_scores.json", "w") as f:
        json.dump(payload, f, indent=2)

    # Simple plots (matplotlib, no seaborn, one chart per figure, no custom colors)
    import matplotlib.pyplot as plt

    # Accuracy (EM)
    plt.figure()
    plt.bar(kdf["model"], kdf["EM"])
    plt.title("Exact Match (EM) by Model")
    plt.xlabel("Model"); plt.ylabel("EM")
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    plt.savefig(outdir / "plots/accuracy_em.png")
    plt.close()

    # Semantic similarity
    plt.figure()
    plt.bar(kdf["model"], kdf["SemSim"])
    plt.title("Semantic Similarity by Model")
    plt.xlabel("Model"); plt.ylabel("Cosine Similarity")
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    plt.savefig(outdir / "plots/semantic_similarity.png")
    plt.close()

    # AutoScore
    plt.figure()
    plt.bar(kdf["model"], kdf["autoScore_0_100"])
    plt.title("AutoScore (0-100) by Model")
    plt.xlabel("Model"); plt.ylabel("AutoScore (0-100)")
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    plt.savefig(outdir / "plots/auto_score.png")
    plt.close()

    print(f"Wrote KPIs -> {kpi_csv}")
    print(f"Wrote chain payload -> {outdir/'aggregated_scores.json'}")
    print(f"Plots in -> {outdir/'plots'}")

if __name__ == "__main__":
    main()
