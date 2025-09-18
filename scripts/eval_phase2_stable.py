#!/usr/bin/env python3
import os, json, argparse, hashlib
from pathlib import Path
import pandas as pd, numpy as np
try: from rouge_score import rouge_scorer
except Exception: rouge_scorer = None
try: import sacrebleu
except Exception: sacrebleu = None
ST = None
try:
    from sentence_transformers import SentenceTransformer, util
    ST = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
except Exception:
    ST = None

def normalize_text(s): return (s or "").strip().lower()
def exact_match(pred, gold): return 1.0 if normalize_text(pred)==normalize_text(gold) else 0.0
def rouge_l(pred, gold):
    if rouge_scorer is None: return np.nan
    sc = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
    return float(sc.score(gold, pred)["rougeL"].fmeasure)
def bleu(pred, gold):
    if sacrebleu is None: return np.nan
    return float(sacrebleu.corpus_bleu([pred], [[gold]]).score/100.0)
def semantic_sim(pred, gold):
    if ST is None: return np.nan
    from sentence_transformers import util as st_util
    emb = ST.encode([pred, gold], convert_to_tensor=True, normalize_embeddings=True)
    return float(st_util.cos_sim(emb[0], emb[1]).item())

def stable_id(name:str)->int:
    # 8 hex chars of SHA-256 → int (stable across runs/machines)
    return int(hashlib.sha256(name.encode()).hexdigest()[:8], 16)

def compute_kpis(df, model_cols):
    rows=[]
    for m in model_cols:
        ems, rls, bls, sims = [], [], [], []
        for _, r in df.iterrows():
            pred = r.get(m, "")
            gold = r.get("ground_truth_answer", "")
            ems.append(exact_match(pred, gold))
            rls.append(rouge_l(pred, gold))
            bls.append(bleu(pred, gold))
            sims.append(semantic_sim(pred, gold))
        EM = np.nanmean(ems) if ems else 0.0
        RL = np.nanmean(rls) if rls else 0.0
        BL = np.nanmean(bls) if bls else 0.0
        SS = np.nanmean(sims) if sims else 0.0
        raw = 0.6*SS + 0.2*RL + 0.2*BL
        bonus = 0.1*EM
        autoScore = max(0.0, min(1.0, raw + bonus)) * 100.0
        rows.append({
            "model": m, "n_samples": int(len(df)),
            "EM": EM, "FailureRate": 1.0-EM,
            "ROUGE_L": RL, "BLEU": BL, "SemSim": SS,
            "autoScore_0_100": autoScore,
        })
    return pd.DataFrame(rows)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--outdir", default="outputs")
    ap.add_argument("--human", default=None, help="CSV: model,humanScore_0_100")
    ap.add_argument("--evidence", default="ipfs://TODO-CID")
    args = ap.parse_args()

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)
    plots_dir = outdir / "plots"; plots_dir.mkdir(parents=True, exist_ok=True)
    df = pd.read_json(args.data, lines=True)

    known = {"id","question","ground_truth_answer","context"}
    model_cols = [c for c in df.columns if c not in known]
    if len(model_cols) < 7:
        print(f"Warning: only {len(model_cols)} model columns found; supervisor asked for >=7.")

    kdf = compute_kpis(df, model_cols)
    (outdir/"model_kpis.csv").write_text(kdf.to_csv(index=False))

    human_map={}
    if args.human and os.path.exists(args.human):
        hdf = pd.read_csv(args.human)
        for _, r in hdf.iterrows():
            human_map[str(r["model"]).strip()] = float(r["humanScore_0_100"])

    payload={"models":[]}
    for _, r in kdf.iterrows():
        name = str(r["model"])
        mid = stable_id(name)
        autoScore = float(r["autoScore_0_100"])
        humanScore = float(human_map.get(name, 0.0))
        weight = int(r["n_samples"])
        payload["models"].append({
            "modelId": int(mid), "name": name,
            "autoScore": int(round(autoScore)),
            "humanScore": int(round(humanScore)),
            "weight": weight, "evidenceURI": args.evidence
        })
    with open(outdir/"aggregated_scores.json","w") as f: json.dump(payload, f, indent=2)

    import matplotlib.pyplot as plt
    plt.figure(); plt.bar(kdf["model"], kdf["EM"]); plt.title("Exact Match (EM) by Model")
    plt.xlabel("Model"); plt.ylabel("EM"); plt.xticks(rotation=30, ha="right"); plt.tight_layout()
    plt.savefig(plots_dir/"accuracy_em.png"); plt.close()

    plt.figure(); plt.bar(kdf["model"], kdf["FailureRate"]); plt.title("Failure Rate (1-EM) by Model")
    plt.xlabel("Model"); plt.ylabel("Failure Rate"); plt.xticks(rotation=30, ha="right"); plt.tight_layout()
    plt.savefig(plots_dir/"failure_rate.png"); plt.close()

    plt.figure(); plt.bar(kdf["model"], kdf["SemSim"]); plt.title("Semantic Similarity by Model")
    plt.xlabel("Model"); plt.ylabel("Cosine Similarity"); plt.xticks(rotation=30, ha="right"); plt.tight_layout()
    plt.savefig(plots_dir/"semantic_similarity.png"); plt.close()

    plt.figure(); plt.bar(kdf["model"], kdf["autoScore_0_100"]); plt.title("AutoScore (0-100) by Model")
    plt.xlabel("Model"); plt.ylabel("AutoScore (0-100)"); plt.xticks(rotation=30, ha="right"); plt.tight_layout()
    plt.savefig(plots_dir/"auto_score.png"); plt.close()

    print(f"Wrote KPIs -> {outdir/'model_kpis.csv'}")
    print(f"Wrote chain payload -> {outdir/'aggregated_scores.json'}")
    print(f"Plots in -> {plots_dir}")
if __name__ == "__main__":
    main()
