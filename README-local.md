# Local run (no paid keys required)
1) Start Hardhat:
   npx hardhat node
2) Start Ollama:
   sudo systemctl start ollama
   ollama pull phi3:mini
3) Start LiteLLM (one-off CLI):
   litellm --model ollama/phi3:mini --host 127.0.0.1 --port 4000
   # Or use OPENAI_BASE_URL=http://127.0.0.1:39699/v1
4) Sanity test:
   curl -sS $OPENAI_BASE_URL/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" \
     -d '{ "model":"gpt-4o-mini","messages":[{"role":"user","content":"Say ONLY: OK"}], "temperature":0 }'
5) Pipeline:
   npm run gen:mmlu && npm run score:mmlu && npm run evidence:mmlu && npm run ipfs:mmlu
   RATING=82 npm run phase5:submit && npm run phase5:report
