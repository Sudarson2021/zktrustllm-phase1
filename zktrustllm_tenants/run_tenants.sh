#!/usr/bin/env bash
set -euo pipefail
TENANTS="${TENANTS:-10}"
RUNS="${RUNS:-1}"
NETWORK="${NETWORK:-localhost}"
echo "==> Deploying $TENANTS tenants on $NETWORK"
TENANTS="$TENANTS" npx hardhat run scripts/tenants_deploy_phase3.js --network "$NETWORK"
echo "==> Submitting feedback for each tenant (RUNS=$RUNS)"
RUNS="$RUNS" npx hardhat run scripts/tenants_submit.js --network "$NETWORK"
echo "==> Summary"
node scripts/tenants_summarize.mjs | tee scripts/tenants_summary.out
