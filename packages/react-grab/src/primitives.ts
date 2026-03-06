import {
  freezeAnimations,
  freezeGlobalAnimations,
  unfreezeGlobalAnimations,
} from "./utils/freeze-animations.js";
import { freezePseudoStates } from "./utils/freeze-pseudo-states.js";
import { freezeUpdates } from "./utils/freeze-updates.js";
import { unfreezePseudoStates } from "./utils/freeze-pseudo-states.js";
import {
  getComponentDisplayName,
  getHTMLPreview,
  getStack,
  getStackContext,
} from "./core/context.js";
import type { StackFrame } from "./core/context.js";
export type { StackFrame };
import { createElementSelector } from "./utils/create-element-selector.js";
import { extractElementCss } from "./utils/extract-element-css.js";
import { openFile as openFileAsync } from "./utils/open-file.js";

export interface OwlGrabElementContext {
  element: Element;
  htmlPreview: string;
  stackString: string;
  stack: StackFrame[];
  componentName: string | null;
  selector: string | null;
  styles: string;
}

// Keep backward compat alias
export type ReactGrabElementContext = OwlGrabElementContext;

/**
 * Gathers comprehensive context for a DOM element, including its OWL component,
 * component name, source stack, HTML preview, CSS selector, and computed styles.
 *
 * @example
 * const context = await getElementContext(document.querySelector('.o_form_view')!);
 * console.log(context.componentName); // "FormView"
 * console.log(context.selector);      // "div.o_form_view"
 * console.log(context.stackString);   // "\n  in FormView\n  in ActionContainer"
 */
export const getElementContext = async (
  element: Element,
): Promise<OwlGrabElementContext> => {
  const stack = (await getStack(element)) ?? [];
  const stackString = await getStackContext(element);
  const htmlPreview = getHTMLPreview(element);
  const componentName = getComponentDisplayName(element);
  const selector = createElementSelector(element);
  const styles = extractElementCss(element);

  return {
    element,
    htmlPreview,
    stackString,
    stack,
    componentName,
    selector,
    styles,
  };
};

const freezeCleanupFns = new Set<() => void>();
let _isFreezeActive = false;

/**
 * Freezes the page by halting OWL updates, pausing CSS/JS animations,
 * and preserving pseudo-states (e.g. :hover, :focus) on the given elements.
 *
 * @example
 * freeze(); // freezes the entire page
 * freeze([document.querySelector('.o_dialog')!]); // freezes only the dialog subtree
 */
export const freeze = (elements?: Element[]): void => {
  _isFreezeActive = true;
  freezeCleanupFns.add(freezeUpdates());
  freezeCleanupFns.add(freezeAnimations(elements ?? [document.body]));
  freezeGlobalAnimations();
  freezePseudoStates();
};

/**
 * Restores normal page behavior by re-enabling OWL updates, resuming
 * animations, and releasing preserved pseudo-states.
 *
 * @example
 * freeze();
 * // ... capture a snapshot ...
 * unfreeze(); // page resumes normal behavior
 */
export const unfreeze = (): void => {
  _isFreezeActive = false;
  for (const cleanup of Array.from(freezeCleanupFns)) {
    cleanup();
  }
  freezeCleanupFns.clear();
  freezeAnimations([]);
  unfreezeGlobalAnimations();
  unfreezePseudoStates();
};

/**
 * Returns whether the page is currently in a frozen state.
 */
export const isFreezeActive = (): boolean => {
  return _isFreezeActive;
};

/**
 * Opens the source file at the given path in the user's editor.
 * Tries the dev-server endpoint first (Vite / Next.js), then falls back
 * to a protocol URL (e.g. vscode://file/…).
 *
 * @example
 * openFile("/src/components/Button.tsx");
 * openFile("/src/components/Button.tsx", 42);
 */
export const openFile = async (
  filePath: string,
  lineNumber?: number,
): Promise<void> => {
  await openFileAsync(filePath, lineNumber);
};
