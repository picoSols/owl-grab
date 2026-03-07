#!/bin/bash
# Sync the built owl-grab bundle into the Odoo addon
# Run after building: pnpm build
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST="$SCRIPT_DIR/../packages/react-grab/dist/index.global.js"
DEST="$SCRIPT_DIR/owl_grab/static/src/js/owl_grab.js"

if [ ! -f "$DIST" ]; then
  echo "Bundle not found. Run 'pnpm build' first."
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
cp "$DIST" "$DEST"
echo "Synced owl-grab bundle to addon: $DEST"
echo "Restart Odoo to pick up changes."
