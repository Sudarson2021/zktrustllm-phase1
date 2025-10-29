#!/usr/bin/env bash
set -euo pipefail
# ensure keyring is available (best-effort)
if ! pgrep -u "$USER" gnome-keyring-daemon >/dev/null 2>&1; then
  eval "$(/usr/bin/gnome-keyring-daemon --start)" || true
  export SSH_AUTH_SOCK=${SSH_AUTH_SOCK:-}
fi
OPENAI_API_KEY="$(secret-tool lookup service openai key default || true)"
if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "No key found in keyring. Run: secret-tool store --label='OpenAI API Key' service openai key default"
  exit 1
fi
export OPENAI_API_KEY
export OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://api.openai.com/v1}
export MODEL=${MODEL:-gpt-5}
exec "$@"
