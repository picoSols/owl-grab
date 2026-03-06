// OWL Grab standalone initializer
// For standalone script injection into Odoo, this is a no-op since
// initialization happens in index.ts when the script loads.
// This file exists for API compatibility.

import type { Options, ReactGrabAPI, SettableOptions } from "./types.js";

declare global {
  interface Window {
    __OWL_GRAB__?: ReactGrabAPI;
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

const shouldActivate = (): boolean => {
  if (typeof window === "undefined") return false;

  // In Odoo, check for debug mode or query param
  const hasQueryParam =
    new URLSearchParams(window.location.search).get("owl-grab") === "true" ||
    new URLSearchParams(window.location.search).get("debug") !== null;

  return hasQueryParam || true; // Always activate in dev for standalone injection
};

/**
 * Initialize OWL Grab programmatically.
 * Call this if you want to control initialization manually instead of
 * relying on the auto-init from the global script.
 */
export const initOwlGrab = (options?: Options): ReactGrabAPI | null => {
  if (!shouldActivate()) return null;

  const existingApi = window.__OWL_GRAB__;
  if (existingApi) {
    const { enabled: _enabled, ...settableOptions } = options ?? {};
    if (Object.keys(settableOptions).length > 0) {
      existingApi.setOptions(settableOptions as SettableOptions);
    }
    return existingApi;
  }

  // Dynamic import to avoid loading the full bundle if not needed
  return null; // Will be initialized by index.ts
};

// Re-export for backward compat
export const ReactGrab = initOwlGrab;
