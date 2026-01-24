#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="artifacts/out"
mkdir -p "$OUT_DIR"

echo "[ZKTrustLLM] Collect/reproduce artifacts -> $OUT_DIR"

# Safe collection (no heavy dependencies required)
if [ -d "artifacts" ]; then
  rsync -a --exclude "out/" artifacts/ "$OUT_DIR/" >/dev/null 2>&1 || true
fi
if [ -d "bridge" ]; then
  rsync -a bridge/ "$OUT_DIR/bridge/" >/dev/null 2>&1 || true
fi

echo "[DONE] Outputs available under: $OUT_DIR"
echo "[NOTE] Wire this script to your full experiment runner if you want full regeneration."
