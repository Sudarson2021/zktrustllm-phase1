import os, re, numpy as np, pandas as pd, matplotlib.pyplot as plt

os.makedirs('results', exist_ok=True)
wide = pd.read_csv('results/all_series.csv')

# --- pick time column robustly ---
time_col = next((c for c in wide.columns
                 if isinstance(c,str) and c.lower() in ('time','t','vectime')),
                wide.columns[0])

def metric_df(metric: str) -> pd.DataFrame:
    """
    Collect columns that begin with '<metric>:' and rename them to the module token
    (e.g. 'successRate:DemoNet.a ...' -> 'DemoNet.a'). Collapse duplicates safely.
    """
    pat = re.compile(rf'^\s*{re.escape(metric)}:(\S+)', re.I)
    # map module -> list of original columns that match
    colmap = {}
    for c in wide.columns:
        if isinstance(c,str):
            m = pat.match(c)
            if m:
                mod = m.group(1)
                colmap.setdefault(mod, []).append(c)

    out = pd.DataFrame({ 'time': pd.to_numeric(wide[time_col], errors='coerce') })
    for mod, cols in colmap.items():
        block = wide[cols].apply(pd.to_numeric, errors='coerce')
        # collapse multiple cols for same module: take rightmost non-NaN per row
        series = block.bfill(axis=1).iloc[:,-1] if block.shape[1] > 1 else block.iloc[:,0]
        out[mod] = series
    return out

def align_and_ratio(numer: pd.DataFrame, denom: pd.DataFrame) -> pd.DataFrame:
    """
    Outer-join on time, forward-fill cumulative counters, compute numer/denom per module.
    """
    if numer.empty or denom.empty: return pd.DataFrame()
    mods = sorted(set(numer.columns) & set(denom.columns) - {'time'})
    # union time grid
    time = pd.concat([numer['time'], denom['time']]).dropna().unique()
    time = np.unique(time)
    out = pd.DataFrame({'time': time})
    for m in mods:
        a = numer[['time', m]].rename(columns={m:'num'}).sort_values('time')
        b = denom[['time', m]].rename(columns={m:'den'}).sort_values('time')
        merged = (out.merge(a, on='time', how='left')
                    .merge(b, on='time', how='left')
                    .sort_values('time')
                    .ffill())
        out[m] = np.where((merged['den']>0) & merged['den'].notna(),
                          merged['num']/merged['den'], np.nan)
    return out.sort_values('time')

def last_valid(col: pd.Series) -> float:
    col = pd.to_numeric(col, errors='coerce').dropna()
    return col.iloc[-1] if len(col) else np.nan

# --- pull metrics from the file ---
succRate = metric_df('successRate')     # already a ratio if your model emits it
gasUsed  = metric_df('gasUsed')         # cumulative gas
sent     = metric_df('sent')            # cumulative submissions

# If your successRate vectors are missing, fall back to successes/sent when available.
succRatio = succRate if (set(succRate.columns)-{'time'}) else align_and_ratio(succRate, sent)
gasPerSub = align_and_ratio(gasUsed, sent)

# --- choose which two series to label as AI vs Baseline ---
# By default we assume DemoNet.a = AI, DemoNet.b = Baseline.
AI_SERIES      = os.environ.get('AI_SERIES', 'DemoNet.a')
BASELINE_SERIES= os.environ.get('BASE_SERIES', 'DemoNet.b')

def pick_two(df):
    cols = [c for c in df.columns if c!='time']
    if AI_SERIES in cols and BASELINE_SERIES in cols:
        return ['time', BASELINE_SERIES, AI_SERIES]
    # fallback: take first two alphabetically
    cols = sorted(cols)[:2]
    return ['time'] + cols

# --- save clean CSVs for the paper ---
def save_metric(df, out_csv, rename_map=None):
    if df.empty:
        print(f"[warn] {out_csv}: metric missing in results/all_series.csv")
        pd.DataFrame(columns=['time','Baseline','AI']).to_csv(out_csv, index=False)
        return
    keep = pick_two(df)
    slim = df[keep].copy()
    if rename_map:
        slim.rename(columns=rename_map, inplace=True)
    slim.to_csv(out_csv, index=False)
    print(f"✓ wrote {out_csv}")

save_metric(succRatio, 'results/success_for_paper.csv',
            rename_map={BASELINE_SERIES:'Baseline', AI_SERIES:'AI', 'time':'time'})
save_metric(gasPerSub, 'results/gas_for_paper.csv',
            rename_map={BASELINE_SERIES:'Baseline', AI_SERIES:'AI', 'time':'time'})

# --- plotting helper (single panel) ---
def plot_one(df, ylabel, out_base, ylim=None, title=None):
    if df.empty: return
    plt.figure(figsize=(6.3,3.4), dpi=300)
    t = pd.to_numeric(df['time'], errors='coerce')
    for col in [c for c in df.columns if c!='time']:
        y = pd.to_numeric(df[col], errors='coerce')
        plt.plot(t, y, label=col)
    if ylim: plt.ylim(*ylim)
    plt.grid(True, linestyle='--', alpha=0.35)
    plt.xlabel('Simulation time [s]')
    plt.ylabel(ylabel)
    if title: plt.title(title)
    plt.legend()
    plt.tight_layout()
    for ext in ('png','svg','pdf'):
        plt.savefig(f'results/{out_base}.{ext}')
    plt.close()
    print(f"✓ wrote results/{out_base}.(png|svg|pdf)")

plot_one(pd.read_csv('results/success_for_paper.csv'),
         ylabel='Success ratio', out_base='paper_success_ratio', ylim=(0,1.05),
         title='Success Ratio: AI vs Baseline')

plot_one(pd.read_csv('results/gas_for_paper.csv'),
         ylabel='Gas per submission', out_base='paper_gas_per_submission',
         title='Gas per Submission: AI vs Baseline')

# --- quick summary table for the manuscript ---
s = pd.read_csv('results/success_for_paper.csv')
g = pd.read_csv('results/gas_for_paper.csv')

def pct(a,b): 
    a = np.asarray(a, float); b = np.asarray(b, float)
    return np.where(a!=0, 100*(b-a)/a, np.nan)

summary = pd.DataFrame({
    "Metric":      ["Mean Success", "Final Success", "Mean Gas/Sub"],
    "Baseline":    [s["Baseline"].mean(), last_valid(s["Baseline"]), g["Baseline"].mean()],
    "AI":          [s["AI"].mean(),       last_valid(s["AI"]),       g["AI"].mean()],
})
summary["Δ (AI−Base)"] = summary["AI"] - summary["Baseline"]
summary["% Change"]    = pct(summary["Baseline"], summary["AI"])

summary.to_csv("results/summary_table.csv", index=False)

# Plain LaTeX tabular (no extra packages required)
def to_latex_simple(df):
    cols = df.columns
    head = " & ".join(cols) + " \\\\ \\hline\n"
    rows = []
    for _, r in df.iterrows():
        vals = [f"{v:.3g}" if isinstance(v,(int,float,np.floating)) else str(v) for v in r]
        rows.append(" & ".join(vals) + " \\\\")
    return "\\begin{tabular}{lrrrr}\n\\hline\n" + head + "\n".join(rows) + "\n\\hline\n\\end{tabular}\n"

with open("results/summary_table.tex","w") as f:
    f.write(to_latex_simple(summary))

print("✓ wrote results/summary_table.csv and results/summary_table.tex")
