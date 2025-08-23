cat > README.md << 'EOF'
# AI Dev Assistant – Backend (Phase 2)

Thin Node.js proxy around **Ollama** with both non‑stream and streaming endpoints.

## Endpoints
- `GET /status` → returns Ollama health + installed models + whether default model is present
- `POST /ask` → JSON body `{ "prompt": "...", "model?": "...", "options?": { ... } }`
- `POST /ask/stream` → responds via SSE-like stream (`data: { text: "..." }`), then `event:done`

## Quickstart
1. Ensure Ollama is running (default `http://localhost:11434`).
2. `npm install`
3. Copy `.env.example` → `.env` and adjust if needed
4. `npm run dev`

## Test
curl http://localhost:3001/status
curl -X POST http://localhost:3001/ask -H 'Content-Type: application/json' -d '{"prompt":"Hello from backend!"}'
curl -N -X POST http://localhost:3001/ask/stream -H 'Content-Type: application/json' -d '{"prompt":"Stream a short haiku."}'
EOF
