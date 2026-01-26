#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/artifacts/out"
LOG="$OUT/logs"

TENANTS="${TENANTS:-10}"
RUNS="${RUNS:-5}"

mkdir -p "$OUT"/{main,baseline_oracle_only,baseline_no_ipfs,logs,evidence,netem}

have_cmd(){ command -v "$1" >/dev/null 2>&1; }

start_hardhat_node(){
  if lsof -iTCP:8545 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[OK] hardhat already on :8545"; return
  fi
  echo "[RUN] starting hardhat node..."
  (cd "$ROOT" && nohup npx hardhat node >"$LOG/hardhat_node.log" 2>&1 &)
  for _ in {1..40}; do
    lsof -iTCP:8545 -sTCP:LISTEN >/dev/null 2>&1 && { echo "[OK] hardhat up"; return; }
    sleep 0.25
  done
  echo "[ERR] hardhat failed (see $LOG/hardhat_node.log)"; exit 1
}

start_ipfs(){
  if ! have_cmd ipfs; then echo "[ERR] ipfs not found on PATH"; exit 1; fi
  ipfs id >/dev/null 2>&1 && { echo "[OK] ipfs already running"; return; }
  echo "[RUN] starting ipfs daemon..."
  nohup ipfs daemon >"$LOG/ipfs_daemon.log" 2>&1 &
  for _ in {1..40}; do
    ipfs id >/dev/null 2>&1 && { echo "[OK] ipfs up"; return; }
    sleep 0.25
  done
  echo "[ERR] ipfs failed (see $LOG/ipfs_daemon.log)"; exit 1
}

require_file(){ [[ -f "$1" ]] || { echo "[ERR] missing output: $1"; exit 1; }; }

echo "[ZKTrustLLM] Collect/reproduce artifacts -> $OUT"
start_hardhat_node
start_ipfs

echo "[MAIN] ZK+IPFS tenants=$TENANTS runs=$RUNS"
(cd "$ROOT" && TENANTS="$TENANTS" RUNS="$RUNS" MODE="main" \
  NDJSON_OUT="$OUT/main/tenants_results.ndjson" \
  EVID_DIR="$OUT/evidence" \
  npx hardhat run scripts/tenants/run_tenants_ndjson.js --network localhost \
) | tee "$LOG/main.log"
require_file "$OUT/main/tenants_results.ndjson"

echo "[B1] oracle-only baseline"
(cd "$ROOT" && N="$((TENANTS*RUNS))" \
  NDJSON_OUT="$OUT/baseline_oracle_only/results.ndjson" \
  npx hardhat run scripts/baselines/oracle_only_ndjson.js --network localhost \
) | tee "$LOG/b1.log"
require_file "$OUT/baseline_oracle_only/results.ndjson"

echo "[B2] no-IPFS baseline (hash-only, keeps ZK-shaped submission)"
(cd "$ROOT" && TENANTS="$TENANTS" RUNS="$RUNS" MODE="no_ipfs" \
  NDJSON_OUT="$OUT/baseline_no_ipfs/tenants_results.ndjson" \
  EVID_DIR="$OUT/evidence" \
  npx hardhat run scripts/tenants/run_tenants_ndjson.js --network localhost \
) | tee "$LOG/b2.log"
require_file "$OUT/baseline_no_ipfs/tenants_results.ndjson"

python3 "$ROOT/scripts/tools/summarize_ndjson.py" \
  "$OUT/main/tenants_results.ndjson" \
  "$OUT/baseline_oracle_only/results.ndjson" \
  "$OUT/baseline_no_ipfs/tenants_results.ndjson" \
  "$OUT/netem/tenants_results_netem.ndjson" \
  >"$OUT/summary.txt" || true

echo "[OK] summary -> $OUT/summary.txt"
echo "[DONE] outputs under $OUT"
