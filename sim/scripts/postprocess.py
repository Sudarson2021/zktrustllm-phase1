import os, numpy as np, pandas as pd, matplotlib.pyplot as plt

os.makedirs('results', exist_ok=True)
vpath = 'results/vectors.csv'
df = pd.read_csv(vpath)

# Keep rows that look like real vector samples: both time & value are numeric
df['time'] = pd.to_numeric(df['vectime'], errors='coerce')
df['val']  = pd.to_numeric(df['vecvalue'], errors='coerce')
df = df.dropna(subset=['time','val'])

# Split "successRate:DemoNet.a" -> metric + series
name = df['name'].astype(str).fillna('')
split = name.str.split(':', n=1, expand=True)
if isinstance(split, pd.DataFrame) and split.shape[1] >= 2:
    df['metric'] = split.iloc[:,0].fillna('')
    df['series_from_name'] = split.iloc[:,1].fillna('')
else:
    df['metric'] = name
    df['series_from_name'] = ''

# Prefer explicit module column when present
module = df['module'].astype(str).fillna('')
df['series'] = np.where(module!='', module, df['series_from_name'])
df.loc[df['series']=='', 'series'] = 'ALL'

def make(metric_name, out_csv, out_png, ylabel, ylim=None, title=None):
    sub = df[df['metric'].str.lower()==metric_name.lower()].copy()
    if sub.empty:
        print(f"[warn] no rows for {metric_name}; available metrics:", 
              sorted(df['metric'].dropna().unique().tolist()))
        return
    wide = (sub.pivot_table(index='time', columns='series', values='val', aggfunc='last')
              .sort_index())
    wide.index.name = 'time'
    wide.to_csv(out_csv)

    plt.figure()
    for col in wide.columns:
        plt.plot(wide.index, wide[col], label=col)
    if ylim: plt.ylim(*ylim)
    plt.grid(True, linestyle='--', alpha=0.4)
    plt.xlabel('Simulation time [s]')
    plt.ylabel(ylabel)
    if title: plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_png, dpi=300)
    print(f"Wrote {out_csv} & {out_png}; series={list(wide.columns)}")

make('successRate', 'results/success.csv', 'results/success.png',
     ylabel='Success rate', ylim=(0,1), title='Feedback Success Rate over Time')

make('gasUsed', 'results/gas.csv', 'results/gas.png',
     ylabel='Gas used', title='Gas Used per Submission')

