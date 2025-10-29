#!/usr/bin/env bash
set -euo pipefail
read -s -p "OpenAI API key: " OPENAI_API_KEY; echo
export OPENAI_API_KEY
export OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://api.openai.com/v1}
# You can override MODEL per-run: MODEL=gpt-5 ./bin/with-openai.sh <cmd>
export MODEL=${MODEL:-gpt-5}
# Optional: tie calls to a specific OpenAI Project (paste your proj_... or export before calling)
export OPENAI_PROJECT=${OPENAI_PROJECT:-}
exec "$@"
