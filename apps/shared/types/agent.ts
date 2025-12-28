// Agent-specific type definitions for browser automation
// Note: ToolName, ToolUse, ToolResult, ContentBlock, AgentChatRequest are exported from schemas/agent.ts

import type { ToolName, ToolUse } from "../schemas/agent";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface AgentStreamEvent {
  type:
    | "content_delta"
    | "tool_use_start"
    | "tool_use"
    | "tool_use_complete"
    | "done"
    | "error";
  content?: string;
  id?: string;
  name?: ToolName;
  toolUse?: ToolUse;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costCents?: number;
  };
}

export interface AgentMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: ToolName;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
  durationMs?: number;
}

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
  backendDOMNodeId?: number;
  children: SnapshotNode[];
}

export interface Snapshot {
  root: SnapshotNode;
  tabId: number;
  url: string;
  title: string;
  timestamp: number;
}

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
  html?: string;
}

export type ScrollDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "top"
  | "bottom";

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs?: number;
}
