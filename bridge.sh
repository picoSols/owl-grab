#!/bin/bash
# OWL Grab Bridge — connects owl-grab in browser to Claude Code on this machine
#
# Usage:
#   ./bridge.sh /path/to/odoo/repo    # Start bridge pointed at your Odoo repo
#   ./bridge.sh                        # Defaults to current directory
#
# This starts a WebSocket relay server on port 4500 that:
#   1. Receives element context + change description from owl-grab in the browser
#   2. Runs Claude Code (via @anthropic-ai/claude-agent-sdk) to make the edit
#   3. Streams status back to the browser overlay
#
# Prerequisites:
#   - claude CLI installed and authenticated
#   - Node.js 18+
#   - npm install in this directory first time
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_DIR="$SCRIPT_DIR/bridge"
CWD="${1:-$(pwd)}"
PORT="${OWL_GRAB_BRIDGE_PORT:-4500}"

# Create bridge directory if needed
mkdir -p "$BRIDGE_DIR"

# Write package.json if not exists
if [ ! -f "$BRIDGE_DIR/package.json" ]; then
  cat > "$BRIDGE_DIR/package.json" << 'EOF'
{
  "name": "owl-grab-bridge",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "latest",
    "ws": "^8.18.0"
  }
}
EOF
fi

# Install deps if needed
if [ ! -d "$BRIDGE_DIR/node_modules" ]; then
  echo "Installing bridge dependencies..."
  cd "$BRIDGE_DIR" && npm install && cd "$SCRIPT_DIR"
fi

# Write the bridge server
cat > "$BRIDGE_DIR/server.mjs" << 'SERVEREOF'
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "node:http";
import { execSync } from "node:child_process";

const PORT = parseInt(process.env.OWL_GRAB_BRIDGE_PORT || "4500", 10);
const CWD = process.env.OWL_GRAB_CWD || process.cwd();

const resolveClaudePath = () => {
  try {
    return execSync(process.platform === "win32" ? "where claude" : "which claude", { encoding: "utf8" }).trim().split("\n")[0];
  } catch {
    return "claude";
  }
};

const claudePath = resolveClaudePath();
const claudeSessionMap = new Map();
const abortedSessions = new Set();
let lastSessionId;

async function* runClaude(prompt, options = {}) {
  const sessionId = options.sessionId;
  const isAborted = () => options.signal?.aborted || (sessionId && abortedSessions.has(sessionId));

  try {
    yield { type: "status", content: "Thinking…" };

    const { query } = await import("@anthropic-ai/claude-agent-sdk");

    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    delete env.VSCODE_INSPECTOR_OPTIONS;

    const claudeSessionId = sessionId ? claudeSessionMap.get(sessionId) : undefined;

    const result = query({
      prompt,
      options: {
        pathToClaudeCodeExecutable: claudePath,
        includePartialMessages: true,
        permissionMode: "bypassPermissions",
        env,
        cwd: CWD,
        ...(claudeSessionId ? { resume: claudeSessionId } : {}),
      },
    });

    let capturedId;

    for await (const message of result) {
      if (isAborted()) break;

      if (!capturedId && message.session_id) capturedId = message.session_id;

      if (message.type === "assistant") {
        const text = message.message.content
          .filter(b => b.type === "text")
          .map(b => b.text)
          .join(" ");
        if (text) yield { type: "status", content: text };
      }

      if (message.type === "result") {
        yield { type: "status", content: message.subtype === "success" ? "✓ Changes applied" : "Task finished" };
      }
    }

    if (!isAborted() && capturedId) {
      if (sessionId) claudeSessionMap.set(sessionId, capturedId);
      lastSessionId = capturedId;
    }

    if (!isAborted()) yield { type: "done", content: "" };
  } catch (error) {
    if (!isAborted()) {
      yield { type: "error", content: error instanceof Error ? error.message : "Unknown error" };
      yield { type: "done", content: "" };
    }
  } finally {
    if (sessionId) abortedSessions.delete(sessionId);
  }
}

async function undoClaude() {
  if (!lastSessionId) return;
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  const result = query({ prompt: "undo", options: { pathToClaudeCodeExecutable: claudePath, env, cwd: CWD, resume: lastSessionId } });
  for await (const _ of result) {}
}

// --- WebSocket relay server ---
const activeSessions = new Map();
const browserSockets = new Set();

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ status: "ok", handlers: ["claude-code"], cwd: CWD }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

const send = (ws, msg) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

wss.on("connection", (ws) => {
  browserSockets.add(ws);

  // Tell browser we have claude-code available
  send(ws, { type: "handlers", handlers: ["claude-code"] });

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "health") {
        send(ws, { type: "health" });
        return;
      }

      const sessionId = msg.sessionId || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      if (msg.type === "agent-request") {
        const prompt = `${msg.context.prompt}\n\n${msg.context.content.join("\n\n")}`;
        const ac = new AbortController();
        activeSessions.set(sessionId, ac);

        try {
          for await (const m of runClaude(prompt, { sessionId, signal: ac.signal })) {
            if (ac.signal.aborted) break;
            const type = m.type === "status" ? "agent-status" : m.type === "error" ? "agent-error" : "agent-done";
            send(ws, { type, agentId: "claude-code", sessionId, content: m.content });
            if (m.type === "done" || m.type === "error") break;
          }
        } catch (e) {
          send(ws, { type: "agent-error", agentId: "claude-code", sessionId, content: e.message });
        } finally {
          activeSessions.delete(sessionId);
        }
      } else if (msg.type === "agent-abort") {
        const ac = activeSessions.get(sessionId);
        if (ac) { ac.abort(); abortedSessions.add(sessionId); activeSessions.delete(sessionId); }
      } else if (msg.type === "agent-undo") {
        try {
          await undoClaude();
          send(ws, { type: "agent-done", agentId: "claude-code", sessionId });
        } catch (e) {
          send(ws, { type: "agent-error", agentId: "claude-code", sessionId, content: e.message });
        }
      }
    } catch {}
  });

  ws.on("close", () => {
    browserSockets.delete(ws);
  });
});

httpServer.listen(PORT, () => {
  console.log(`\x1b[35m✿\x1b[0m \x1b[1mOWL Grab Bridge\x1b[0m`);
  console.log(`  Relay:  ws://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  CWD:    ${CWD}`);
  console.log(`  Claude: ${claudePath}`);
  console.log(`\n  Waiting for owl-grab connections...\n`);
});
SERVEREOF

echo ""
echo "Starting OWL Grab Bridge..."
echo "  Working directory: $CWD"
echo "  Port: $PORT"
echo ""

OWL_GRAB_CWD="$CWD" OWL_GRAB_BRIDGE_PORT="$PORT" node "$BRIDGE_DIR/server.mjs"
