// agent.js — uses local Ollama (free, no API keys)
import fetch from "node-fetch";

const OLLAMA_URL = "http://localhost:11434/api/generate";

async function askOllama(prompt) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",   // you already pulled mistral
      prompt,
      stream: false
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(\`HTTP \${res.status}: \${text}\`);
  }

  const data = await res.json();
  console.log("\n🤖 Response:", data.response);
}

askOllama("Explain what a stack trace is in simple words.");
