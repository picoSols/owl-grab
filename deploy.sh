#!/bin/bash
# OWL Grab - Deploy to Odoo dev environment
#
# Usage:
#   ./deploy.sh                    # Build + copy to clipboard as bookmarklet
#   ./deploy.sh /path/to/addons    # Build + deploy as Odoo addon
#   ./deploy.sh --serve            # Build + serve on localhost:3333
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_FILE="$SCRIPT_DIR/packages/react-grab/dist/index.global.js"

# Build if needed
if [ ! -f "$DIST_FILE" ] || [ "$1" = "--rebuild" ]; then
  echo "Building owl-grab..."
  cd "$SCRIPT_DIR"

  # Quick build of just the browser bundle
  cd packages/react-grab
  if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    cd "$SCRIPT_DIR"
    pnpm install 2>/dev/null || npm install 2>/dev/null
    cd packages/react-grab
  fi

  # Build CSS first
  mkdir -p dist
  npx tailwindcss -i ./src/styles.css -o ./dist/styles.css -m 2>/dev/null || true
  node scripts/css-rem-to-px.mjs 2>/dev/null || true

  # Build the bundle
  NODE_ENV=production npx tsup 2>/dev/null
  cd "$SCRIPT_DIR"
  echo "Build complete: $DIST_FILE"
fi

if [ ! -f "$DIST_FILE" ]; then
  echo "ERROR: Build failed - $DIST_FILE not found"
  exit 1
fi

FILE_SIZE=$(wc -c < "$DIST_FILE" | tr -d ' ')
echo "Bundle size: $(echo "scale=1; $FILE_SIZE / 1024" | bc)KB"

# Mode: Serve locally
if [ "$1" = "--serve" ]; then
  PORT="${2:-3333}"
  echo ""
  echo "Serving owl-grab on http://localhost:$PORT/owl-grab.js"
  echo ""
  echo "Add this to your browser console on any Odoo page:"
  echo "  const s=document.createElement('script');s.src='http://localhost:$PORT/owl-grab.js';document.head.appendChild(s)"
  echo ""
  echo "Or use this bookmarklet:"
  echo "  javascript:void(document.head.appendChild(Object.assign(document.createElement('script'),{src:'http://localhost:$PORT/owl-grab.js'})))"
  echo ""
  cd "$(dirname "$DIST_FILE")"
  # Rename for cleaner URL
  cp index.global.js owl-grab.js
  python3 -m http.server "$PORT" --bind 127.0.0.1
  exit 0
fi

# Mode: Deploy as Odoo addon
if [ -n "$1" ] && [ "$1" != "--rebuild" ]; then
  ADDONS_DIR="$1"
  ADDON_DIR="$ADDONS_DIR/owl_grab"

  echo "Deploying to Odoo addon: $ADDON_DIR"

  mkdir -p "$ADDON_DIR/static/src/js"
  mkdir -p "$ADDON_DIR/static/src/xml"

  # __manifest__.py
  cat > "$ADDON_DIR/__manifest__.py" << 'PYEOF'
{
    "name": "OWL Grab",
    "version": "17.0.1.0.0",
    "category": "Tools",
    "summary": "Select context for coding agents directly from your Odoo UI",
    "description": "Dev tool: hover any element, press Cmd+C to copy OWL component context for AI agents.",
    "author": "picoSols",
    "license": "MIT",
    "depends": ["web"],
    "assets": {
        "web.assets_backend": [
            "owl_grab/static/src/js/owl_grab.js",
        ],
    },
    "auto_install": False,
    "installable": True,
    "application": False,
}
PYEOF

  # __init__.py
  touch "$ADDON_DIR/__init__.py"

  # Copy the bundle
  cp "$DIST_FILE" "$ADDON_DIR/static/src/js/owl_grab.js"

  echo "Done! Restart Odoo and install the 'OWL Grab' module."
  echo "Or just activate it in Settings > Apps."
  exit 0
fi

# Default mode: Show all injection methods
echo ""
echo "=== OWL Grab - Injection Methods ==="
echo ""
echo "1) BOOKMARKLET (easiest - drag to bookmarks bar):"
echo "   javascript:void(fetch('https://raw.githubusercontent.com/picoSols/owl-grab/main/packages/react-grab/dist/index.global.js').then(r=>r.text()).then(t=>eval(t)))"
echo ""
echo "2) CONSOLE (paste in browser devtools on any Odoo page):"
echo "   const s=document.createElement('script');s.src='file://$DIST_FILE';document.head.appendChild(s)"
echo ""
echo "3) LOCAL SERVER (run './deploy.sh --serve' then):"
echo "   const s=document.createElement('script');s.src='http://localhost:3333/owl-grab.js';document.head.appendChild(s)"
echo ""
echo "4) ODOO ADDON (run './deploy.sh /path/to/odoo/addons'):"
echo "   Installs as a proper Odoo module"
echo ""
echo "5) COPY BUNDLE TO CLIPBOARD:"
if command -v pbcopy &>/dev/null; then
  cat "$DIST_FILE" | pbcopy
  echo "   Done! Bundle copied to clipboard. Paste in browser console."
else
  echo "   cat $DIST_FILE | xclip -selection clipboard"
fi
echo ""
