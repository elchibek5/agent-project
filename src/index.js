// src/index.js
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434/api/chat";
const MODEL = process.env.OLLAMA_MODEL ?? "mistral";
const CHATLOG_PATH = process.env.CHATLOG_PATH ?? "chatlog.txt";

// In-memory conversation
const messages = []; // [{ role: "user"|"assistant", content: string }]

// --- Helpers ---
function nowISO() {
  return new Date().toISOString().slice(0, 19);
}

function formatTranscript(msgs) {
  return msgs.map(m => `[${(m.role || "unknown").toUpperCase()}] ${m.content ?? ""}`).join("\n");
}

function saveChatlog(filePath = CHATLOG_PATH) {
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
  const header = `\n\n===== CHAT LOG @ ${nowISO()} =====\n`;
  const body = formatTranscript(messages);
  const footer = `\n===== END LOG =====\n`;
  fs.appendFileSync(filePath, header + body + footer, { encoding: "utf-8" });
  return filePath;
}

// --- Command handler ---
function handleCommand(cmd) {
  const c = cmd.trim().toLowerCase();

  if (c === ":clear") {
    messages.length = 0;
    console.log("✅ Conversation memory cleared.");
    return true;
  }

  if (c === ":save") {
    if (messages.length === 0) {
      console.log("ℹ️ Nothing to save (conversation is empty).");
    } else {
      const p = saveChatlog();
      console.log(`💾 Conversation saved to: ${p}`);
    }
    return true;
  }

  if (c === ":help" || c === ":h") {
    console.log("Commands: :clear  (reset memory), :save  (append transcript to chatlog.txt), :help");
    return true;
  }

  return false; // not a command
}

// --- Ollama call (Node 18+ has global fetch) ---
async function askOllama(userText) {
  const payload = {
    model: MODEL,
    messages: [...messages, { role: "user", content: userText }],
    stream: false
  };

  const r = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const data = await r.json();
  return data?.message?.content ?? "";
}

// --- REPL loop ---
async function main() {
  console.log("Ollama Dev Assistant (type :help for commands)");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (q) => new Promise(res => rl.question(q, res));

  while (true) {
    let userText;
    try {
      userText = await prompt("\nYou: ");
    } catch {
      console.log("\n👋 Exiting.");
      break;
    }

    userText = (userText ?? "").trim();
    if (!userText) continue;

    // Intercept commands first
    if (userText.startsWith(":")) {
      if (handleCommand(userText)) continue;
    }

    // Normal chat turn
    messages.push({ role: "user", content: userText });

    let reply = "";
    try {
      reply = await askOllama(userText);
    } catch (e) {
      console.error("❌ Error contacting Ollama:", e.message);
      messages.pop(); // rollback last user message on failure
      continue;
    }

    messages.push({ role: "assistant", content: reply });
    console.log(`\nAssistant: ${reply}`);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
