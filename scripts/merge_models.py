import sys, pandas as pd
# usage: python3 scripts/merge_models.py base.jsonl new.jsonl merged.jsonl
base, new, out = sys.argv[1], sys.argv[2], sys.argv[3]
A = pd.read_json(base, lines=True)
B = pd.read_json(new, lines=True)
cols_keep = ["id","question","ground_truth_answer","context"]
merged = A.merge(B[[c for c in B.columns if c not in cols_keep]], left_index=True, right_index=True, how="left")
merged.to_json(out, lines=True, orient="records")
print("Wrote", out, "with columns:", merged.columns.tolist())
