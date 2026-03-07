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

## Installation

There are three ways to use OWL Grab, depending on your needs:

| Method | Persists across refreshes | Best for |
|---|---|---|
| [Console / Bookmarklet](#1-console--bookmarklet-quick--temporary) | No | Quick one-off inspection |
| [Odoo Addon](#2-odoo-addon-persists-across-refreshes) | Yes | Regular development |
| [Browser Extension](#3-browser-extension-works-on-any-site) | Yes | Works on any Odoo instance without server access |

---

### 1. Console / Bookmarklet (quick & temporary)

Paste this in your browser console on any Odoo page:

```js
const s = document.createElement("script");
s.src = "https://raw.githubusercontent.com/picoSols/owl-grab/main/packages/react-grab/dist/index.global.js";
document.head.appendChild(s);
```

Or save this as a **bookmarklet** (drag to your bookmarks bar):

```
javascript:void(document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://raw.githubusercontent.com/picoSols/owl-grab/main/packages/react-grab/dist/index.global.js'})))
```

> This only lasts for the current page session — a hard refresh clears it.

#### Local development server

If you've cloned the repo and want to iterate:

```bash
./deploy.sh --serve    # serves on localhost:3333
```

Then inject via console:

```js
const s = document.createElement("script"); s.src = "http://localhost:3333/owl-grab.js"; document.head.appendChild(s);
```

---

### 2. Odoo Addon (persists across refreshes)

Install as an Odoo module that auto-loads in the web client. **Only activates in debug mode** (`?debug=1`), so it won't affect production.

#### Option A: Symlink from this repo (recommended for development)

```bash
# Clone the repo
git clone https://github.com/picoSols/owl-grab.git
cd owl-grab

# Build the bundle
pnpm install && pnpm build

# Sync the bundle into the addon
cd odoo_addon && ./sync.sh

# Symlink into your Odoo addons path
ln -s "$(pwd)/owl_grab" /path/to/odoo/addons/owl_grab
```

Then restart Odoo, update the apps list, and install **OWL Grab**.

To update: `git pull && pnpm build && cd odoo_addon && ./sync.sh` then restart Odoo.

#### Option B: Generate a standalone addon

```bash
./deploy.sh /path/to/odoo/addons
```

This copies the built bundle into a self-contained Odoo module at the given path.

---

### 3. Browser Extension (works on any site)

The extension injects OWL Grab on every page and lets you toggle it on/off with a toolbar button. Works on any Odoo instance without needing server access.

#### Install from source

```bash
# Build the extension
pnpm run extension:build

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select packages/web-extension/dist
```

The extension icon in the toolbar toggles OWL Grab on/off. State persists across pages and refreshes.

---

## Usage

Once loaded (via any method above), hover over any UI element in your Odoo app and press:

- **Cmd+C** on Mac
- **Ctrl+C** on Windows/Linux

The element's context (OWL component name, component tree, and HTML) is copied to your clipboard.

### Controls

- **Cmd+C / Ctrl+C** — copy element context to clipboard
- **Right-click** — context menu with more actions (copy HTML, copy styles, open in editor)
- **Arrow keys** — navigate between sibling/parent elements while selecting
- **Drag** — select multiple elements at once
- `data-owl-grab-ignore` — add to elements you want the tool to skip
- `data-owl-grab-frozen` — freeze element state during inspection

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

## Building from Source

```bash
# Prerequisites: Node.js >= 18, pnpm >= 8

# Install dependencies
pnpm install

# Build the core library
pnpm build

# Development mode (watch)
pnpm dev

# Build the browser extension
pnpm run extension:build
```

## Project Structure

```
odoo_addon/              Installable Odoo module
packages/
  react-grab/            Core library (OWL-adapted)
  grab/                  Bundled package (library + CLI)
  cli/                   CLI implementation
  mcp/                   MCP server integration
  web-extension/         Browser extension (Chrome/Edge)
  provider-cursor/       Cursor agent integration
  provider-claude-code/  Claude Code integration
  provider-copilot/      Copilot integration
  provider-codex/        OpenAI Codex integration
  provider-gemini/       Google Gemini CLI integration
  website/               Documentation site
  benchmarks/            Performance benchmarks
deploy.sh                Build + deploy to Odoo environments
bridge.sh                Claude Code bridge server
```

## How It Differs from React Grab

| | React Grab | OWL Grab |
|---|---|---|
| **Framework** | React (Fiber tree) | OWL 2.x (`__owl__` nodes) |
| **Target** | React apps (Next.js, Vite, etc.) | Odoo 17+ web client |
| **Component detection** | React DevTools internals | OWL component tree traversal |
| **Source mapping** | Full file paths via source maps | Component names (OWL doesn't expose source files at runtime) |
| **Injection** | npm install / build plugin | Console, Odoo addon, browser extension |
| **Global API** | `window.__REACT_GRAB__` | `window.__OWL_GRAB__` (+ backward compat) |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and guidelines.

## License

MIT — based on [react-grab](https://github.com/aidenybai/react-grab) by [Aiden Bai](https://github.com/aidenybai).
