// agent.js — interactive local chatbot with memory (Ollama)
import readline from "node:readline";
import fetch from "node-fetch";

const CHAT_URL = "http://localhost:11434/api/chat";
const MODEL = "mistral"; // or "mistral:latest", "llama3", etc.

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

// Conversation memory (system + turns)
const messages = [
  { role: "system", content: "You are a concise, helpful developer assistant." }
];

async function chatOnce(userInput) {
  messages.push({ role: "user", content: userInput });

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const assistantMsg = data?.message?.content ?? "(no response)";
  messages.push({ role: "assistant", content: assistantMsg });
  return assistantMsg;
}

(async () => {
  console.log(`🤖 Local Dev Assistant — model: ${MODEL}`);
  console.log(`Type "exit" to quit.\n`);

  while (true) {
    const input = (await ask("You > ")).trim();
    if (!input) continue;
    if (input.toLowerCase() === "exit") break;

    try {
      const reply = await chatOnce(input);
      console.log("\nAssistant >", reply, "\n");
    } catch (e) {
      console.error("Error:", e.message || e);
    }
  }

  rl.close();
})();
