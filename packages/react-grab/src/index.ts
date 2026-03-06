export { init } from "./core/index.js";
export {
  getStack,
  formatElementInfo,
  isInstrumentationActive,
  DEFAULT_THEME,
} from "./core/index.js";
export { commentPlugin } from "./core/plugins/comment.js";
export { openPlugin } from "./core/plugins/open.js";
export { generateSnippet } from "./utils/generate-snippet.js";
export type {
  Options,
  ReactGrabAPI,
  SourceInfo,
  Theme,
  ReactGrabState,
  ToolbarState,
  OverlayBounds,
  GrabbedBox,
  DragRect,
  Rect,
  DeepPartial,
  ElementLabelVariant,
  PromptModeContext,
  CrosshairContext,
  ElementLabelContext,
  AgentContext,
  AgentSession,
  AgentProvider,
  AgentSessionStorage,
  AgentOptions,
  AgentCompleteResult,
  SettableOptions,
  ActivationMode,
  ContextMenuAction,
  ContextMenuActionContext,
  ToolbarMenuAction,
  PluginAction,
  ActionContext,
  ActionContextHooks,
  Plugin,
  PluginConfig,
  PluginHooks,
} from "./types.js";

import { init } from "./core/index.js";
import type { ReactGrabAPI } from "./types.js";

// Type aliases for OWL naming
export type OwlGrabAPI = ReactGrabAPI;

declare global {
  interface Window {
    __OWL_GRAB__?: ReactGrabAPI;
    // Keep backward compat
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

let globalApi: ReactGrabAPI | null = null;

export const getGlobalApi = (): ReactGrabAPI | null => {
  if (typeof window === "undefined") return globalApi;
  return window.__OWL_GRAB__ ?? globalApi ?? null;
};

export const setGlobalApi = (api: ReactGrabAPI | null): void => {
  globalApi = api;
  if (typeof window !== "undefined") {
    if (api) {
      window.__OWL_GRAB__ = api;
      window.__REACT_GRAB__ = api; // backward compat
    } else {
      delete window.__OWL_GRAB__;
      delete window.__REACT_GRAB__;
    }
  }
};

if (typeof window !== "undefined") {
  if (window.__OWL_GRAB__) {
    globalApi = window.__OWL_GRAB__;
  } else {
    globalApi = init();
    window.__OWL_GRAB__ = globalApi;
    window.__REACT_GRAB__ = globalApi; // backward compat
  }
  window.dispatchEvent(
    new CustomEvent("owl-grab:init", { detail: globalApi }),
  );
}
