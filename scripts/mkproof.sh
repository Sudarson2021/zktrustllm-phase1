#!/usr/bin/env bash
set -euo pipefail

PCT="${1:-}"
if [[ -z "$PCT" ]]; then
  echo "usage: scripts/mkproof.sh <percent>"; exit 1
fi

# must be multiple of 4 because N=25 (autoScore * 25 == sum(bits) * 100)
if (( PCT < 0 || PCT > 100 || PCT % 4 != 0 )); then
  echo "error: percent must be 0..100 and a multiple of 4 (e.g., 88, 92)"; exit 2
fi

K=$(( PCT / 4 )) # number of ones (0..25)
# build bits array with K ones and (25-K) zeros
BITS="$(node -e "const k=$K; const a=[...Array(k).fill(1), ...Array(25-k).fill(0)]; console.log(JSON.stringify(a));")"

# write input JSON
cat > circuits/input_example.json <<JSON
{
  "bits": $BITS,
  "n": 25,
  "autoScore": $PCT
}
JSON

# witness + proof + verify
node build-circuits/score_js/generate_witness.js build-circuits/score_js/score.wasm circuits/input_example.json build-circuits/witness.wtns
npx snarkjs groth16 prove score_final.zkey build-circuits/witness.wtns proof.json public.json
npx snarkjs groth16 verify vk.json public.json proof.json
echo "✅ proof ready for ${PCT}% -> proof.json / public.json"
