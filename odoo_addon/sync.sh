#!/bin/bash
# Sync the built owl-grab bundle into the Odoo addon
# Run after building: pnpm build
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST="$SCRIPT_DIR/../packages/react-grab/dist/index.global.js"
DEST="$SCRIPT_DIR/owl_grab/static/lib/owl_grab.js"

if [ ! -f "$DIST" ]; then
  echo "Bundle not found. Run 'pnpm build' first."
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
# Wrap the bundle so it only runs when the loader has set the debug flag
# Replace this.globalThis with window.globalThis for strict-mode compatibility
{
  echo '(function(){if(!window.__OWL_GRAB_ENABLED__)return;'
  sed 's/^this\.globalThis/window.globalThis/;s/this\.globalThis/window.globalThis/g' "$DIST"
  echo '})();'
} > "$DEST"
echo "Synced owl-grab bundle to addon: $DEST"
echo "Restart Odoo to pick up changes."
