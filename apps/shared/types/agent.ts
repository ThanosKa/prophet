// Agent-specific type definitions for browser automation
// Note: ToolName, ToolUse, ToolResult, ContentBlock, AgentChatRequest are exported from schemas/agent.ts

import type { ToolName, ToolUse, ContentBlock } from "../schemas/agent";

export interface WebSearchSource {
  url: string;
  title: string;
  pageAge?: string | null;
}

export interface WebSearchCitationRef {
  url: string;
  title: string;
  citedText: string;
}

export interface ToolDefinition {
  name: ToolName;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface AgentMetrics {
  inputTokens: number;
  outputTokens: number;
  costCents?: number;
  durationMs?: number;
  webSearchRequests?: number;
  webSearchCostCents?: number;
}

export type AgentStatus =
  | "idle"
  | "submitted"
  | "streaming"
  | "executing_tools"
  | "error";

export type AgentLoopEvent =
  | { type: "session_created"; sessionId: string }
  | { type: "session_resumed"; sessionId: string; itemCount: number }
  | { type: "content_delta"; delta: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "tool_call_start"; toolName: ToolName; params: unknown; toolCallId: string }
  | { type: "tool_call_complete"; toolName: ToolName; result: unknown; toolCallId: string }
  | { type: "tool_call_error"; toolName: ToolName; error: string; toolCallId: string }
  | { type: "web_search_start"; toolUseId: string; query: string }
  | { type: "web_search_results"; toolUseId: string; sources: WebSearchSource[] }
  | { type: "web_search_error"; toolUseId: string; errorCode: string }
  | { type: "citations"; citations: WebSearchCitationRef[] }
  | { type: "metrics_update"; metrics: AgentMetrics }
  | { type: "execution_complete"; finalOutput: string; metrics: AgentMetrics }
  | { type: "error"; error: string; code?: string; details?: { pricingUrl?: string; retryAfter?: number; remaining?: number } }
  | {
      type: "done";
      usage?: {
        inputTokens: number;
        outputTokens: number;
        costCents?: number;
        webSearchRequests?: number;
        webSearchCostCents?: number;
      };
    };

export type AgentEvent = AgentLoopEvent;

export interface AgentStreamEvent {
  type:
    | "content_delta"
    | "thinking_delta"
    | "tool_use_start"
    | "tool_use"
    | "tool_use_complete"
    | "done"
    | "error"
    | "session_created"
    | "metrics_update"
    | "execution_complete"
    | "tool_call_start"
    | "tool_call_complete"
    | "tool_call_error"
    | "web_search_start"
    | "web_search_results"
    | "web_search_error"
    | "citations";
  content?: string;
  delta?: string;
  id?: string;
  name?: ToolName;
  toolUse?: ToolUse;
  error?: string;
  code?: string;
  details?: { pricingUrl?: string; retryAfter?: number; remaining?: number };
  toolUseId?: string;
  query?: string;
  sources?: WebSearchSource[];
  errorCode?: string;
  citations?: WebSearchCitationRef[];
  contentBlocks?: ContentBlock[];
  stopReason?: string | null;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costCents?: number;
    webSearchRequests?: number;
    webSearchCostCents?: number;
  };
  metrics?: AgentMetrics;
  finalOutput?: string;
  sessionId?: string;
  toolCallId?: string;
  toolName?: ToolName;
  params?: unknown;
  input?: Record<string, unknown>;
  result?: unknown;
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
