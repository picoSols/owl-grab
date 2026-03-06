// OWL Grab Loader - Drop this file anywhere accessible to your Odoo dev server
// Then add a <script> tag to load it, or paste it into your browser console.
//
// Option A: Add to your Odoo dev config (odoo.conf):
//   dev_mode = assets
//   Then place this file in your custom addon's static/src/js/
//
// Option B: Paste this entire file into browser devtools console
//
// Option C: Bookmark this as a bookmarklet (minified version below)
//
// The loader fetches the latest built bundle from GitHub or localhost.

(function() {
  if (window.__OWL_GRAB__) {
    console.log('[OWL Grab] Already loaded');
    return;
  }

  const sources = [
    // Try local dev server first (if you're running ./deploy.sh --serve)
    'http://localhost:3333/owl-grab.js',
    // Fall back to GitHub raw (your fork's built artifact)
    'https://raw.githubusercontent.com/picoSols/owl-grab/main/packages/react-grab/dist/index.global.js',
  ];

  async function tryLoad() {
    for (const src of sources) {
      try {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        console.log(`[OWL Grab] Loaded from ${src}`);
        return;
      } catch (e) {
        // Try next source
        const failedScript = document.querySelector(`script[src="${src}"]`);
        if (failedScript) failedScript.remove();
      }
    }
    console.error('[OWL Grab] Failed to load from any source');
  }

  tryLoad();
})();
