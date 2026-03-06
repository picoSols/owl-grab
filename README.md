# <img src="https://github.com/picoSols/owl-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> OWL Grab

[![version](https://img.shields.io/npm/v/owl-grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/owl-grab)
[![license](https://img.shields.io/npm/l/owl-grab?style=flat&colorA=000000&colorB=000000)](https://github.com/picoSols/owl-grab/blob/main/LICENSE)

Select context for coding agents directly from your Odoo website.

Point at any element in your Odoo UI and press **Cmd+C** (Mac) or **Ctrl+C** (Windows/Linux) to copy the OWL component name, HTML source, and component tree — ready to paste into Cursor, Claude Code, Copilot, or any other coding agent.

A fork of [react-grab](https://github.com/aidenybai/react-grab), adapted for the **Odoo OWL 2.x** component framework (Odoo 17+).

## How It Works

OWL Grab walks the OWL component tree attached to DOM elements (`__owl__` nodes) to resolve component names and hierarchy. When you hover over an element and press the copy shortcut, it produces context like:

```
<button class="btn btn-primary" name="action_confirm">
  Confirm
</button>
  in SaleOrderForm
  in FormView
  in ActionContainer
```

This gives coding agents the component context they need to find and edit the right code.

## Quick Start

### Bookmarklet (easiest)

Create a bookmark with this URL — click it on any Odoo page to activate:

```
javascript:void(fetch('https://raw.githubusercontent.com/picoSols/owl-grab/main/packages/react-grab/dist/index.global.js').then(r=>r.text()).then(t=>eval(t)))
```

### Browser Console

Open DevTools on any Odoo page and paste:

```js
const s = document.createElement("script");
s.src = "https://raw.githubusercontent.com/picoSols/owl-grab/main/packages/react-grab/dist/index.global.js";
document.head.appendChild(s);
```

### Local Server

```bash
./deploy.sh --serve
```

Then on your Odoo page:

```js
const s = document.createElement("script");
s.src = "http://localhost:3333/owl-grab.js";
document.head.appendChild(s);
```

### Odoo Addon

Deploy as a proper Odoo module that auto-loads in the backend:

```bash
./deploy.sh /path/to/odoo/addons
```

Then restart Odoo and install the **OWL Grab** module from Settings > Apps.

## Claude Code Bridge

OWL Grab includes a bridge server that connects the in-browser UI directly to Claude Code. Select an element, describe what you want to change, and Claude Code edits the file on your machine.

```bash
./bridge.sh /path/to/odoo/repo
```

This starts a WebSocket relay on port 4500 that:

1. Receives element context + change description from owl-grab in the browser
2. Runs Claude Code (via `@anthropic-ai/claude-agent-sdk`) to make the edit
3. Streams status back to the browser overlay

**Prerequisites:** `claude` CLI installed and authenticated, Node.js 18+.

## Usage

Once loaded, hover over any UI element in your Odoo app and press:

- **Cmd+C** on Mac
- **Ctrl+C** on Windows/Linux

The element's context (OWL component name, component tree, and HTML) is copied to your clipboard.

### Additional Controls

- **Right-click** an element for a context menu with more actions (copy HTML, copy styles, open in editor)
- **Arrow keys** to navigate between sibling/parent elements while selecting
- **Drag** to select multiple elements at once
- Use `data-owl-grab-ignore` on elements you want the tool to skip
- Use `data-owl-grab-frozen` to freeze element state during inspection

## Plugins

Extend OWL Grab with plugins via `window.__OWL_GRAB__`:

```js
window.__OWL_GRAB__.registerPlugin({
  name: "my-plugin",
  hooks: {
    onElementSelect: (element) => {
      console.log("Selected:", element.tagName);
    },
  },
  actions: [
    {
      id: "my-action",
      label: "My Action",
      shortcut: "M",
      onAction: (context) => {
        console.log("Action on:", context.element);
        context.hideContextMenu();
      },
    },
  ],
});
```

The legacy `window.__REACT_GRAB__` global is also available for backward compatibility.

## Deploy Script

The `deploy.sh` script provides multiple injection methods:

| Command | Description |
|---|---|
| `./deploy.sh` | Show all injection methods + copy bundle to clipboard |
| `./deploy.sh --serve` | Serve on `localhost:3333` for script-tag injection |
| `./deploy.sh /path/to/addons` | Generate a full Odoo addon module |
| `./deploy.sh --rebuild` | Force a fresh build before deploying |

## Building from Source

```bash
# Prerequisites: Node.js >= 18, pnpm >= 8

# Install dependencies
pnpm install

# Build the core library
pnpm build

# Development mode (watch)
pnpm dev
```

## Project Structure

```
packages/
  react-grab/          Core library (OWL-adapted)
  grab/                Bundled package (library + CLI)
  cli/                 CLI implementation
  mcp/                 MCP server integration
  provider-cursor/     Cursor agent integration
  provider-claude-code/  Claude Code integration
  provider-copilot/    Copilot integration
  provider-codex/      OpenAI Codex integration
  provider-gemini/     Google Gemini CLI integration
  web-extension/       Browser extension
  website/             Documentation site
  benchmarks/          Performance benchmarks
deploy.sh              Build + deploy to Odoo environments
bridge.sh              Claude Code bridge server
```

## How It Differs from React Grab

| | React Grab | OWL Grab |
|---|---|---|
| **Framework** | React (Fiber tree) | OWL 2.x (`__owl__` nodes) |
| **Target** | React apps (Next.js, Vite, etc.) | Odoo 17+ web client |
| **Component detection** | React DevTools internals | OWL component tree traversal |
| **Source mapping** | Full file paths via source maps | Component names (OWL doesn't expose source files at runtime) |
| **Injection** | npm install / build plugin | Bookmarklet, console, Odoo addon |
| **Global API** | `window.__REACT_GRAB__` | `window.__OWL_GRAB__` (+ backward compat) |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and guidelines.

## License

MIT — based on [react-grab](https://github.com/aidenybai/react-grab) by [Aiden Bai](https://github.com/aidenybai).
