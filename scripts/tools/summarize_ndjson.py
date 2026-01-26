#!/usr/bin/env python3
import json, sys, statistics, os

def pctl(xs, q):
    xs = sorted(xs)
    if not xs: return None
    k = (len(xs)-1) * (q/100.0)
    f = int(k); c = min(f+1, len(xs)-1)
    if f == c: return xs[f]
    return xs[f] + (xs[c]-xs[f])*(k-f)

def load(path):
    if not path or not os.path.exists(path): return []
    rows=[]
    with open(path,"r",encoding="utf-8") as f:
        for line in f:
            line=line.strip()
            if not line: continue
            rows.append(json.loads(line))
    return rows

def summarize(rows, label):
    lat=[r.get("latency_ms") for r in rows if isinstance(r.get("latency_ms"), (int,float))]
    gas=[]
    for r in rows:
        g=r.get("gasUsed")
        if g is None: continue
        try: gas.append(int(g))
        except: pass
    if not rows:
        print(f"{label}: NO DATA"); return
    mg = int(statistics.mean(gas)) if gas else None
    print(f"{label}: n={len(rows)} p50_lat={pctl(lat,50)}ms p95_lat={pctl(lat,95)}ms mean_gas={mg}")

def main():
    paths=sys.argv[1:]
    labels=["MAIN(ZK+IPFS)","B1(Oracle-only)","B2(No-IPFS)","NETEM(optional)"]
    for i,p in enumerate(paths[:4]):
        summarize(load(p), labels[i])

if __name__=="__main__": main()
