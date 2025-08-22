// agent.js
import fetch from "node-fetch"; // make sure you installed with: npm install node-fetch

const OLLAMA_URL = "http://localhost:11434/api/generate";

async function askOllama(prompt) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral", // or llama3, gemma, etc.
      prompt,
      stream: false,   // set true if you want real-time tokens
    }),
  });

  const data = await res.json();
  console.log("\n🤖 Response:", data.response);
}

// Example usage
askOllama("Explain what a stack trace is in simple words.");
