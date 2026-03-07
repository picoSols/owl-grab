<p align="center">
  <img src="https://github.com/picoSols/owl-grab/blob/main/.github/public/logo.png?raw=true" width="120" />
</p>

<h1 align="center">OWL Grab</h1>

<p align="center">
  <strong>Select context for coding agents directly from your Odoo website.</strong>
</p>

<p align="center">
  <a href="https://github.com/picoSols/owl-grab/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-18181b?style=flat&colorA=18181b" alt="MIT License" /></a>
  <a href="https://github.com/picoSols/owl-grab"><img src="https://img.shields.io/badge/odoo-17%2B%20%2F%2018-714B67?style=flat&colorA=18181b" alt="Odoo 17+ / 18" /></a>
  <a href="https://github.com/picoSols/owl-grab/stargazers"><img src="https://img.shields.io/github/stars/picoSols/owl-grab?style=flat&colorA=18181b&colorB=18181b" alt="Stars" /></a>
</p>

<p align="center">
  Hover over any element in your Odoo UI, press <kbd>Cmd</kbd>+<kbd>C</kbd> or <kbd>Ctrl</kbd>+<kbd>C</kbd>, and get the OWL component name, tree, and HTML &mdash; ready to paste into Cursor, Claude Code, Copilot, or any coding agent.
</p>

<p align="center">
  Adapted from <a href="https://github.com/aidenybai/react-grab">react-grab</a> for <strong>Odoo OWL 2.x</strong> (Odoo 17+).
</p>

---

## How It Works

OWL Grab walks the component tree from the root (`odoo.__WOWL_DEBUG__`) and matches DOM elements to their owning OWL components. When you copy an element, it produces context like:

```
<button class="btn btn-primary" name="action_confirm">
  Confirm
</button>
  in SaleOrderForm
  in FormView
  in ActionContainer
```

Paste this into any coding agent and it knows exactly which component to target.

---

## Installation

| Method | Persists? | Best for |
|---|---|---|
| [Console / Bookmarklet](#console--bookmarklet) | No | Quick one-off inspection |
| [Odoo Addon](#odoo-addon) | Yes | Day-to-day development |
| [Browser Extension](#browser-extension) | Yes | Any Odoo instance, no server access needed |

### Console / Bookmarklet

Paste in your browser console on any Odoo page:

```js
fetch("https://cdn.jsdelivr.net/gh/picoSols/owl-grab@main/packages/react-grab/dist/index.global.js")
  .then(r => r.text())
  .then(t => {
    const s = document.createElement("script");
    s.src = URL.createObjectURL(new Blob([t], { type: "text/javascript" }));
    document.head.appendChild(s);
  });
```

Or save as a bookmarklet:

```
javascript:void(fetch('https://cdn.jsdelivr.net/gh/picoSols/owl-grab@main/packages/react-grab/dist/index.global.js').then(r=>r.text()).then(t=>{const s=document.createElement('script');s.src=URL.createObjectURL(new Blob([t],{type:'text/javascript'}));document.head.appendChild(s)}))
```

> Clears on page refresh.
>
> **Note:** These use `fetch` + Blob URL instead of loading a `<script>` from an external domain, which avoids Odoo's Content Security Policy restrictions on `script-src`. If your Odoo instance also blocks `blob:` sources, use the [Browser Extension](#browser-extension) or [Odoo Addon](#odoo-addon) instead.

### Odoo Addon

Installs as a native Odoo module. Only activates in debug mode (`?debug=1`).

```bash
git clone https://github.com/picoSols/owl-grab.git
cd owl-grab
pnpm install && pnpm build
cd odoo_addon && ./sync.sh && cd ..

# Symlink into your addons path
ln -s "$(pwd)/odoo_addon/owl_grab" /path/to/odoo/addons/owl_grab
```

Then restart Odoo, update the apps list, and install **OWL Grab**.

To update: `git pull && pnpm build && cd odoo_addon && ./sync.sh` and restart.

> **Docker users:** Symlinks don't work inside Docker volume mounts. Copy the `owl_grab/` folder directly into your custom-addons directory instead.

<details>
<summary>How the addon works</summary>

The addon places files in `static/lib/` instead of `static/src/` to avoid Odoo 18's automatic ES module transpilation. A small loader checks `odoo.debug` and injects the bundle as a plain `<script>` tag, bypassing the Odoo module system entirely.
</details>

### Browser Extension

Works on any Odoo instance, including localhost. No server access needed.

```bash
pnpm install && pnpm run extension:build
```

Then load in Chrome (or any Chromium browser):
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `packages/web-extension/dist`

Click the extension icon to toggle OWL Grab on or off.

---

## Usage

| Shortcut | Action |
|---|---|
| <kbd>Cmd</kbd>+<kbd>C</kbd> / <kbd>Ctrl</kbd>+<kbd>C</kbd> | Copy element context to clipboard |
| **Right-click** | Context menu with additional actions |
| **Arrow keys** | Navigate between sibling and parent elements |
| **Click + drag** | Select multiple elements at once |

### Data Attributes

| Attribute | Effect |
|---|---|
| `data-owl-grab-ignore` | Element is skipped during selection |
| `data-owl-grab-frozen` | Element state is frozen during inspection |

---

## Using with Odoo Customizations

OWL Grab is a **read-only inspection tool**. It helps you identify components and views but does not modify your Odoo instance.

To make changes that survive Odoo upgrades:

1. **Grab** the component context with OWL Grab
2. **Paste** it into your coding agent (Claude Code, Cursor, Copilot, etc.)
3. **Write** the change in a custom addon module

Always use Odoo's inheritance mechanisms in your custom addons:

- **`patch()`** for JS/OWL component overrides
- **`xpath`** for XML view and template changes
- Never modify core Odoo source files

---

## Claude Code Bridge

Connect the browser UI directly to Claude Code. Select an element, describe the change, and Claude Code edits the file on your machine.

```bash
./bridge.sh /path/to/odoo/repo
```

This starts a WebSocket relay on port 4500 that receives context from the browser, runs Claude Code via `@anthropic-ai/claude-agent-sdk`, and streams progress back to the overlay.

Requires the `claude` CLI installed and authenticated, and Node.js 18+.

---

## Plugins

Extend OWL Grab via the global API:

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
pnpm install                 # install dependencies
pnpm build                   # build core library
pnpm dev                     # development mode (watch)
pnpm run extension:build     # build browser extension
```

Requires Node.js >= 18 and pnpm >= 8.

---

## Project Structure

```
odoo_addon/                  Installable Odoo module (debug-mode only)
packages/
  react-grab/                Core library (OWL-adapted)
  web-extension/             Browser extension (Chrome / Edge)
  grab/                      Bundled package (library + CLI)
  cli/                       CLI tool
  mcp/                       MCP server integration
  provider-cursor/           Cursor agent provider
  provider-claude-code/      Claude Code agent provider
  provider-copilot/          Copilot agent provider
  provider-codex/            OpenAI Codex agent provider
  provider-gemini/           Gemini CLI agent provider
deploy.sh                    Build + deploy helper
bridge.sh                    Claude Code bridge server
```

---

## React Grab vs OWL Grab

| | React Grab | OWL Grab |
|---|---|---|
| **Framework** | React (Fiber tree) | OWL 2.x (component tree) |
| **Target** | React apps | Odoo 17+ / 18 web client |
| **Detection** | `__reactFiber$` on DOM nodes | Walk from `odoo.__WOWL_DEBUG__` root |
| **Source mapping** | File paths via source maps | Component names (OWL has no runtime source info) |
| **Install** | npm / build plugin | Console, addon, or extension |
| **Global API** | `window.__REACT_GRAB__` | `window.__OWL_GRAB__` |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](./LICENSE)

Originally based on [react-grab](https://github.com/aidenybai/react-grab) by [Aiden Bai](https://github.com/aidenybai). OWL framework adaptation and Odoo-specific features by [picoSols](https://github.com/picoSols).

## Acknowledgements

- **[react-grab](https://github.com/aidenybai/react-grab)** by [Aiden Bai](https://github.com/aidenybai) — the original project this fork is built on. Core architecture, UI overlay, plugin system, and agent integrations all originate from react-grab.
- **[Prism](https://github.com/akshithambekar/prism)** by [Akshith Ambekar](https://github.com/akshithambekar) — inspiration for framework-agnostic component tree traversal techniques.
