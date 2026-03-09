import {
  PREVIEW_TEXT_MAX_LENGTH,
  PREVIEW_ATTR_VALUE_MAX_LENGTH,
  PREVIEW_MAX_ATTRS,
  PREVIEW_PRIORITY_ATTRS,
} from "../constants.js";
import { getTagName } from "../utils/get-tag-name.js";
import { truncateString } from "../utils/truncate-string.js";

// OWL 2.x component node interface (Odoo 17+)
interface OwlNode {
  component: OwlComponent;
  parentTree?: OwlNode;
  children?: OwlNode[];
  fiber?: unknown;
  bdom?: unknown;
  el?: Element | null;
}

interface OwlComponent {
  constructor: { name: string };
  props?: Record<string, unknown>;
  env?: Record<string, unknown>;
  __owl__?: OwlNode;
}

export interface StackFrame {
  functionName?: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  isServer?: boolean;
  isSymbolicated?: boolean;
}

const NON_COMPONENT_PREFIXES = new Set([
  "_",
  "$",
]);

const ODOO_INTERNAL_COMPONENT_NAMES = new Set([
  "App",
  "Root",
  "ErrorHandler",
  "Transition",
  "TransitionGroup",
  "Portal",
  "AsyncRoot",
  "LazyComponent",
  "ComponentAdapter",
  "WidgetAdapterMixin",
]);

export const checkIsSourceComponentName = (name: string): boolean => {
  if (name.length <= 1) return false;
  if (ODOO_INTERNAL_COMPONENT_NAMES.has(name)) return false;
  for (const prefix of NON_COMPONENT_PREFIXES) {
    if (name.startsWith(prefix)) return false;
  }
  // OWL components are PascalCase by convention
  if (!/^[A-Z]/.test(name)) return false;
  return true;
};

// Check if this is an Odoo/OWL project
let cachedIsOdooProject: boolean | undefined;

export const checkIsNextProject = (revalidate?: boolean): boolean => {
  // Repurposed: checks if this is an Odoo project
  if (revalidate) {
    cachedIsOdooProject = undefined;
  }
  cachedIsOdooProject ??=
    typeof document !== "undefined" &&
    Boolean(
      getOwlApp() ||
      document.querySelector("[data-owl-app]") ||
      (window as unknown as Record<string, unknown>).__owl__
    );
  return cachedIsOdooProject;
};

// Get the OWL app instance if available
const getOwlApp = (): unknown | null => {
  const w = window as unknown as Record<string, unknown>;
  if (w.__owl_devtools__) return w.__owl_devtools__;
  if (w.odoo && typeof w.odoo === "object") {
    const odoo = w.odoo as Record<string, unknown>;
    if (odoo.__WOWL_DEBUG__) return odoo.__WOWL_DEBUG__;
  }
  return null;
};

// Get the root DOM element(s) for an OWL ComponentNode
const getComponentRootEl = (node: OwlNode): Element | null => {
  // node.bdom is the virtual DOM; its .el is the root DOM element
  const bdom = node.bdom as { el?: Element; firstNode?: () => Element | null } | null;
  if (!bdom) return null;
  if (bdom.el instanceof Element) return bdom.el;
  if (typeof bdom.firstNode === "function") {
    const first = bdom.firstNode();
    if (first instanceof Element) return first;
  }
  return null;
};

// Walk the OWL component tree to find the deepest component that owns a DOM element
const findOwlNodeForElement = (
  node: OwlNode,
  target: Element,
): OwlNode | null => {
  // Check children first (depth-first) so we find the deepest match
  const children = node.children;
  if (children) {
    // children can be an object (keyed) or array
    const childNodes: OwlNode[] = Array.isArray(children)
      ? children
      : Object.values(children);
    for (const child of childNodes) {
      const found = findOwlNodeForElement(child, target);
      if (found) return found;
    }
  }

  // Check if this component's root element contains (or is) the target
  const rootEl = getComponentRootEl(node);
  if (rootEl && (rootEl === target || rootEl.contains(target))) {
    return node;
  }

  return null;
};

// Get the OWL root ComponentNode from __WOWL_DEBUG__
const getOwlRootNode = (): OwlNode | null => {
  const w = window as unknown as Record<string, unknown>;
  const odoo = w.odoo as Record<string, unknown> | undefined;
  const debug = odoo?.__WOWL_DEBUG__ as { root?: OwlComponent } | undefined;
  if (debug?.root?.__owl__) return debug.root.__owl__;

  // Also check __owl_devtools__
  const devtools = w.__owl_devtools__ as { root?: OwlComponent } | undefined;
  if (devtools?.root?.__owl__) return devtools.root.__owl__;

  return null;
};

// Get the OWL node from a DOM element
const getOwlNodeFromElement = (element: Element): OwlNode | null => {
  // First try direct __owl__ on element (some OWL versions may add this)
  const el = element as Element & { __owl__?: OwlNode };
  if (el.__owl__) return el.__owl__;

  // Walk the component tree from the root to find the owning component
  const root = getOwlRootNode();
  if (root) {
    return findOwlNodeForElement(root, element);
  }

  return null;
};

// Check if OWL instrumentation is available
export const isInstrumentationActive = (): boolean => {
  if (typeof document === "undefined") return false;
  const body = document.body;
  if (!body) return false;

  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.__owl__ || w.__owl_devtools__ || getOwlApp());
};

const findNearestOwlElement = (element: Element): Element => {
  // First check direct __owl__ on elements (fast path)
  let current: Element | null = element;
  while (current) {
    const owlEl = current as Element & { __owl__?: OwlNode };
    if (owlEl.__owl__) return current;
    current = current.parentElement;
  }

  // For OWL 2.x: find via component tree — the component's root element
  const node = getOwlNodeFromElement(element);
  if (node) {
    const rootEl = getComponentRootEl(node);
    if (rootEl) return rootEl;
  }

  return element;
};

const stackCache = new WeakMap<Element, Promise<StackFrame[] | null>>();

const buildStackFromOwlNode = (node: OwlNode): StackFrame[] => {
  const frames: StackFrame[] = [];
  let current: OwlNode | undefined = node;

  while (current) {
    const componentName = current.component?.constructor?.name;
    if (componentName && checkIsSourceComponentName(componentName)) {
      frames.push({
        functionName: componentName,
        // OWL doesn't expose source file info at runtime,
        // but Odoo's module system can help identify the module
        fileName: undefined,
        lineNumber: undefined,
        columnNumber: undefined,
      });
    }
    current = current.parentTree;
  }

  return frames;
};

const fetchStackForElement = async (
  element: Element,
): Promise<StackFrame[] | null> => {
  try {
    const node = getOwlNodeFromElement(element);
    if (!node) return null;
    return buildStackFromOwlNode(node);
  } catch {
    return null;
  }
};

export const getStack = (element: Element): Promise<StackFrame[] | null> => {
  const resolvedElement = findNearestOwlElement(element);
  const cached = stackCache.get(resolvedElement);
  if (cached) return cached;

  const promise = fetchStackForElement(resolvedElement);
  stackCache.set(resolvedElement, promise);
  return promise;
};

export const getNearestComponentName = async (
  element: Element,
): Promise<string | null> => {
  const stack = await getStack(element);
  if (!stack) return null;

  for (const frame of stack) {
    if (frame.functionName && checkIsSourceComponentName(frame.functionName)) {
      return frame.functionName;
    }
  }

  return null;
};

export const resolveSourceFromStack = (
  stack: StackFrame[] | null,
): {
  filePath: string;
  lineNumber: number | undefined;
  componentName: string | null;
} | null => {
  if (!stack || stack.length === 0) return null;
  for (const frame of stack) {
    if (frame.fileName) {
      return {
        filePath: frame.fileName,
        lineNumber: frame.lineNumber,
        componentName:
          frame.functionName && checkIsSourceComponentName(frame.functionName)
            ? frame.functionName
            : null,
      };
    }
  }
  // For OWL, we may not have file paths but we still have component names
  for (const frame of stack) {
    if (frame.functionName && checkIsSourceComponentName(frame.functionName)) {
      return {
        filePath: `(OWL component: ${frame.functionName})`,
        lineNumber: undefined,
        componentName: frame.functionName,
      };
    }
  }
  return null;
};

const isUsefulComponentName = (name: string): boolean => {
  if (!name) return false;
  if (ODOO_INTERNAL_COMPONENT_NAMES.has(name)) return false;
  return true;
};

export const getComponentDisplayName = (element: Element): string | null => {
  const resolvedElement = findNearestOwlElement(element);
  const node = getOwlNodeFromElement(resolvedElement);
  if (!node) return null;

  let currentNode: OwlNode | undefined = node;
  while (currentNode) {
    const name = currentNode.component?.constructor?.name;
    if (name && isUsefulComponentName(name)) {
      return name;
    }
    currentNode = currentNode.parentTree;
  }

  return null;
};

interface StackContextOptions {
  maxLines?: number;
}

const getComponentNamesFromOwlNode = (
  element: Element,
  maxCount: number,
): string[] => {
  const node = getOwlNodeFromElement(element);
  if (!node) return [];

  const componentNames: string[] = [];
  let currentNode: OwlNode | undefined = node;

  while (currentNode && componentNames.length < maxCount) {
    const name = currentNode.component?.constructor?.name;
    if (name && isUsefulComponentName(name)) {
      componentNames.push(name);
    }
    currentNode = currentNode.parentTree;
  }

  return componentNames;
};

export const formatStackContext = (
  stack: StackFrame[],
  options: StackContextOptions = {},
): string => {
  const { maxLines = 3 } = options;
  const stackContext: string[] = [];

  for (const frame of stack) {
    if (stackContext.length >= maxLines) break;

    if (frame.functionName && checkIsSourceComponentName(frame.functionName)) {
      let line = `\n  in ${frame.functionName}`;
      if (frame.fileName) {
        line += ` (at ${frame.fileName}`;
        if (frame.lineNumber && frame.columnNumber) {
          line += `:${frame.lineNumber}:${frame.columnNumber}`;
        }
        line += `)`;
      }
      stackContext.push(line);
    }
  }

  return stackContext.join("");
};

export const getStackContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const maxLines = options.maxLines ?? 3;
  const stack = await getStack(element);

  if (stack && stack.length > 0) {
    return formatStackContext(stack, options);
  }

  const componentNames = getComponentNamesFromOwlNode(element, maxLines);
  if (componentNames.length > 0) {
    return componentNames.map((name) => `\n  in ${name}`).join("");
  }

  return "";
};

export const getElementContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const resolvedElement = findNearestOwlElement(element);
  const html = getHTMLPreview(resolvedElement);
  const stackContext = await getStackContext(resolvedElement, options);

  if (stackContext) {
    return `${html}${stackContext}`;
  }

  return getFallbackContext(resolvedElement);
};

const getFallbackContext = (element: Element): string => {
  const tagName = getTagName(element);

  if (!(element instanceof HTMLElement)) {
    const attrsHint = formatPriorityAttrs(element, {
      truncate: false,
      maxAttrs: PREVIEW_PRIORITY_ATTRS.length,
    });
    return `<${tagName}${attrsHint} />`;
  }

  const text = element.innerText?.trim() ?? element.textContent?.trim() ?? "";

  let attrsText = "";
  for (const { name, value } of element.attributes) {
    attrsText += ` ${name}="${value}"`;
  }

  const truncatedText = truncateString(text, PREVIEW_TEXT_MAX_LENGTH);

  if (truncatedText.length > 0) {
    return `<${tagName}${attrsText}>\n  ${truncatedText}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};

const truncateAttrValue = (value: string): string =>
  truncateString(value, PREVIEW_ATTR_VALUE_MAX_LENGTH);

interface FormatPriorityAttrsOptions {
  truncate?: boolean;
  maxAttrs?: number;
}

const formatPriorityAttrs = (
  element: Element,
  options: FormatPriorityAttrsOptions = {},
): string => {
  const { truncate = true, maxAttrs = PREVIEW_MAX_ATTRS } = options;
  const priorityAttrs: string[] = [];

  for (const name of PREVIEW_PRIORITY_ATTRS) {
    if (priorityAttrs.length >= maxAttrs) break;
    const value = element.getAttribute(name);
    if (value) {
      const formattedValue = truncate ? truncateAttrValue(value) : value;
      priorityAttrs.push(`${name}="${formattedValue}"`);
    }
  }

  return priorityAttrs.length > 0 ? ` ${priorityAttrs.join(" ")}` : "";
};

export const getHTMLPreview = (element: Element): string => {
  const tagName = getTagName(element);
  if (!(element instanceof HTMLElement)) {
    const attrsHint = formatPriorityAttrs(element);
    return `<${tagName}${attrsHint} />`;
  }
  const text = element.innerText?.trim() ?? element.textContent?.trim() ?? "";

  let attrsText = "";
  for (const { name, value } of element.attributes) {
    attrsText += ` ${name}="${truncateAttrValue(value)}"`;
  }

  const topElements: Array<Element> = [];
  const bottomElements: Array<Element> = [];
  let foundFirstText = false;

  const childNodes = Array.from(element.childNodes);
  for (const node of childNodes) {
    if (node.nodeType === Node.COMMENT_NODE) continue;

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent && node.textContent.trim().length > 0) {
        foundFirstText = true;
      }
    } else if (node instanceof Element) {
      if (!foundFirstText) {
        topElements.push(node);
      } else {
        bottomElements.push(node);
      }
    }
  }

  const formatElements = (elements: Array<Element>): string => {
    if (elements.length === 0) return "";
    if (elements.length <= 2) {
      return elements
        .map((childElement) => `<${getTagName(childElement)} ...>`)
        .join("\n  ");
    }
    return `(${elements.length} elements)`;
  };

  let content = "";
  const topElementsStr = formatElements(topElements);
  if (topElementsStr) content += `\n  ${topElementsStr}`;
  if (text.length > 0) {
    content += `\n  ${truncateString(text, PREVIEW_TEXT_MAX_LENGTH)}`;
  }
  const bottomElementsStr = formatElements(bottomElements);
  if (bottomElementsStr) content += `\n  ${bottomElementsStr}`;

  if (content.length > 0) {
    return `<${tagName}${attrsText}>${content}\n</${tagName}>`;
  }
  return `<${tagName}${attrsText} />`;
};
