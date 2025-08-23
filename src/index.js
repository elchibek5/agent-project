import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const PORT = process.env.PORT || 3001;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:latest';

// Root ping
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'ai-dev-assistant-backend', version: '0.1.0' });
});

// Health check + model presence
app.get('/status', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!r.ok) throw new Error(`Ollama responded ${r.status}`);
    const data = await r.json();
    const hasModel = Array.isArray(data.models)
      ? data.models.some((m) => m.name === OLLAMA_MODEL || m.model === OLLAMA_MODEL)
      : false;

    res.json({
      ok: true,
      ollama: 'up',
      model: OLLAMA_MODEL,
      modelInstalled: hasModel,
      models: data.models?.map((m) => m.name || m.model) || [],
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: String(err) });
  }
});

// Non-streaming generate
app.post('/ask', async (req, res) => {
  const { prompt, model, options } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt (string) is required' });
  }
  const usedModel = model || OLLAMA_MODEL;

  try {
    const r = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: usedModel, prompt, stream: false, options }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: 'ollama_error', details: text });
    }

    const data = await r.json(); // { response, done, ... }
    res.json({ model: usedModel, response: data.response, done: data.done });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Streaming (SSE-like) generate
app.post('/ask/stream', async (req, res) => {
  const { prompt, model, options } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`event:error\ndata:${JSON.stringify({ error: 'prompt (string) is required' })}\n\n`);
    return res.end();
  }

  const usedModel = model || OLLAMA_MODEL;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  try {
    const r = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: usedModel, prompt, stream: true, options }),
    });

    if (!r.ok) {
      const text = await r.text();
      res.write(`event:error\ndata:${JSON.stringify({ error: 'ollama_error', details: text })}\n\n`);
      return res.end();
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;

        try {
          const json = JSON.parse(line); // Ollama streams one JSON object per line
          const piece = json.response || '';
          if (piece) {
            full += piece;
            res.write(`data:${JSON.stringify({ text: piece })}\n\n`);
          }
          if (json.done) {
            res.write(`event:done\ndata:${JSON.stringify({ model: usedModel, totalChars: full.length })}\n\n`);
            return res.end();
          }
        } catch {
          // Ignore partial JSON; it will complete in the next chunk
        }
      }
    }

    // If stream ended without explicit done
    res.write(`event:done\ndata:${JSON.stringify({ model: usedModel, totalChars: full.length })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`event:error\ndata:${JSON.stringify({ error: String(err) })}\n\n`);
    res.end();
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`➡️  Server listening on http://localhost:${PORT}`);
  console.log(`➡️  Using Ollama at ${OLLAMA_HOST} (model: ${OLLAMA_MODEL})`);
});
