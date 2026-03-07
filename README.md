# <img src="https://github.com/picoSols/owl-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> OWL Grab

[![version](https://img.shields.io/npm/v/owl-grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/owl-grab)
[![license](https://img.shields.io/npm/l/owl-grab?style=flat&colorA=000000&colorB=000000)](https://github.com/picoSols/owl-grab/blob/main/LICENSE)

**Select context for coding agents directly from your Odoo website.**

Hover over any element in your Odoo UI, press **Cmd+C** (Mac) or **Ctrl+C** (Windows/Linux), and get the OWL component name, component tree, and HTML — ready to paste into Cursor, Claude Code, Copilot, or any coding agent.

Adapted from [react-grab](https://github.com/aidenybai/react-grab) for the **Odoo OWL 2.x** framework (Odoo 17+).

---

## How It Works

OWL Grab reads the `__owl__` component tree attached to DOM elements. When you copy, it produces context like:

```
<button class="btn btn-primary" name="action_confirm">
  Confirm
</button>
  in SaleOrderForm
  in FormView
  in ActionContainer
```

Paste this into any coding agent — it knows exactly which component to find and edit.

---

## Installation

Pick the method that fits your workflow:

| Method | Persists? | Best for |
|---|---|---|
| [Console / Bookmarklet](#1-console--bookmarklet) | No | Quick one-off inspection |
| [Odoo Addon](#2-odoo-addon) | Yes | Day-to-day development |
| [Browser Extension](#3-browser-extension) | Yes | Any Odoo instance, no server access needed |

### 1. Console / Bookmarklet

Paste in your browser DevTools console on any Odoo page:

```js
const s = document.createElement("script");
s.src = "https://raw.githubusercontent.com/picoSols/owl-grab/main/packages/react-grab/dist/index.global.js";
document.head.appendChild(s);
```

Or drag this as a **bookmarklet** to your bookmarks bar:

```
javascript:void(document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://raw.githubusercontent.com/picoSols/owl-grab/main/packages/react-grab/dist/index.global.js'})))
```

> Clears on page refresh. For local development, run `./deploy.sh --serve` and point at `http://localhost:3333/owl-grab.js` instead.

### 2. Odoo Addon

Installs as an Odoo module. **Only activates in debug mode** (`?debug=1`).

**Symlink from this repo** (easiest to keep updated):

```bash
git clone https://github.com/picoSols/owl-grab.git
cd owl-grab

# Build and sync the bundle into the addon
pnpm install && pnpm build
cd odoo_addon && ./sync.sh && cd ..

# Symlink into your Odoo addons path
ln -s "$(pwd)/odoo_addon/owl_grab" /path/to/odoo/addons/owl_grab
```

Restart Odoo, update the apps list, and install **OWL Grab**.

**To update:** `git pull && pnpm build && cd odoo_addon && ./sync.sh`, then restart Odoo.

**Alternative** — generate a standalone addon copy:

```bash
./deploy.sh /path/to/odoo/addons
```

### 3. Browser Extension

Toggle OWL Grab on/off from the Chrome toolbar. Works on any Odoo instance.

```bash
pnpm install && pnpm run extension:build
```

Then load in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `packages/web-extension/dist`

---

## Usage

Once loaded, hover over any element and press:

| Shortcut | Action |
|---|---|
| **Cmd+C** / **Ctrl+C** | Copy element context to clipboard |
| **Right-click** | Context menu (copy HTML, copy styles, open in editor) |
| **Arrow keys** | Navigate between sibling/parent elements |
| **Click + drag** | Select multiple elements |

### Data Attributes

| Attribute | Effect |
|---|---|
| `data-owl-grab-ignore` | Element is skipped during selection |
| `data-owl-grab-frozen` | Element state is frozen during inspection |

---

## Claude Code Bridge

Connect the browser UI directly to Claude Code. Select an element, describe the change, and Claude Code edits the file on your machine.

```bash
./bridge.sh /path/to/odoo/repo
```

Starts a WebSocket relay on port 4500:
1. Receives element context + change description from the browser
2. Runs Claude Code via `@anthropic-ai/claude-agent-sdk`
3. Streams progress back to the browser overlay

**Requires:** `claude` CLI installed and authenticated, Node.js 18+.

---

## Plugins

Extend OWL Grab via `window.__OWL_GRAB__`:

```js
window.__OWL_GRAB__.registerPlugin({
  name: "my-plugin",
  hooks: {
    onElementSelect: (element) => console.log("Selected:", element.tagName),
  },
  actions: [
    {
      id: "my-action",
      label: "My Action",
      shortcut: "M",
      onAction: (ctx) => {
        console.log("Action on:", ctx.element);
        ctx.hideContextMenu();
      },
    },
  ],
});
```

`window.__REACT_GRAB__` is also available for backward compatibility.

---

## Building from Source

```bash
pnpm install        # install dependencies
pnpm build          # build core library
pnpm dev            # development mode (watch)
pnpm run extension:build   # build browser extension
```

Requires Node.js >= 18 and pnpm >= 8.

## Project Structure

```
odoo_addon/              Installable Odoo module (debug-mode only)
packages/
  react-grab/            Core library (OWL-adapted)
  web-extension/         Browser extension (Chrome/Edge)
  grab/                  Bundled package (library + CLI)
  cli/                   CLI implementation
  mcp/                   MCP server integration
  provider-cursor/       Cursor agent integration
  provider-claude-code/  Claude Code integration
  provider-copilot/      Copilot integration
  provider-codex/        OpenAI Codex integration
  provider-gemini/       Google Gemini CLI integration
deploy.sh                Build + deploy to Odoo environments
bridge.sh                Claude Code bridge server
```

## React Grab vs OWL Grab

| | React Grab | OWL Grab |
|---|---|---|
| **Framework** | React (Fiber tree) | OWL 2.x (`__owl__` nodes) |
| **Target** | React apps (Next.js, Vite, etc.) | Odoo 17+ web client |
| **Component detection** | React DevTools internals | OWL component tree traversal |
| **Source mapping** | File paths via source maps | Component names (OWL doesn't expose files at runtime) |
| **Installation** | npm package / build plugin | Console, Odoo addon, or browser extension |
| **Global API** | `window.__REACT_GRAB__` | `window.__OWL_GRAB__` |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and guidelines.

## License

MIT — based on [react-grab](https://github.com/aidenybai/react-grab) by [Aiden Bai](https://github.com/aidenybai).
