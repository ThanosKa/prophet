import type {
  ToolCall,
  AgentLoopEvent as SharedAgentLoopEvent,
} from "@prophet/shared";

export interface SnapshotNode {
  uid: string;
  role: string;
  name: string;
  value?: string;
  tagName?: string;
  focused?: boolean;
  disabled?: boolean;
  checked?: boolean;
  selected?: boolean;
  expanded?: boolean;
  backendDOMNodeId?: number;
  children: SnapshotNode[];
}

export interface Snapshot {
  root: SnapshotNode;
  idToNode: Map<string, SnapshotNode>;
  tabId: number;
  url: string;
  title: string;
  timestamp: number;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ScrollDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "top"
  | "bottom";

export interface ScreenshotResult {
  base64: string;
  mimeType: "image/png" | "image/jpeg";
  width: number;
  height: number;
}

export interface PageContent {
  url: string;
  title: string;
  text: string;
}

export const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "searchbox",
  "combobox",
  "listbox",
  "option",
  "checkbox",
  "radio",
  "switch",
  "slider",
  "spinbutton",
  "tab",
  "tablist",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "tree",
  "treeitem",
  "grid",
  "gridcell",
  "row",
  "rowheader",
  "columnheader",
  "cell",
  "scrollbar",
  "progressbar",
  "alertdialog",
  "dialog",
  "tooltip",
]);

export const SEMANTIC_ROLES = new Set([
  "heading",
  "article",
  "main",
  "navigation",
  "banner",
  "contentinfo",
  "complementary",
  "form",
  "region",
  "list",
  "listitem",
  "table",
  "img",
  "figure",
  "figcaption",
]);

export type { ToolCall };

// Re-export AgentLoopEvent for backward compatibility in this file if needed, 
// but we should ideally use the shared one.
export type AgentLoopEvent = SharedAgentLoopEvent;
