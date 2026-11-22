import { z } from "zod";
import { logger } from "../logger";
import { executeToolViaBackground } from "./background-bridge";
import {
  AGENT_ERROR_CODES,
  AGENT_SIZE_LIMITS,
  DEFAULT_AGENT_MODEL,
  MAX_AGENT_TURNS,
  contentBlockSchema,
  runEndSchema,
  toolInputSchemas,
  toolNameSchema,
  toolUseSchema,
  type RunEnd,
} from "@prophet/shared";
import {
  USER_FACING_TEXT,
  describeHttpFailure,
  parseErrorBody,
  parseErrorDetails,
  type ErrorDetails,
} from "@/lib/user-facing-errors";
import type {
  AgentStreamEvent,
  AgentModel,
  ToolResult,
  ContentBlock,
  ImageData,
  AgentLoopEvent,
  AgentTurn,
  ToolName,
} from "@prophet/shared";
import type { ToolExecutionResult } from "./types";

interface StreamAgentChatOptions {
  chatId: string;
  model: AgentModel;
  userMessage?: string;
  previousTurns?: AgentTurn[];
  runId?: string;
  image?: ImageData;
  enableThinking?: boolean;
}

export type AgentRunErrorEvent = { type: "error"; error: string; code?: string; details?: ErrorDetails };

export type RunNoticeReason = RunEnd | "superseded" | "request_too_large";

export type AgentRunEvent =
  | Exclude<AgentLoopEvent, { type: "error" }>
  | AgentRunErrorEvent
  | { type: "output_truncated"; reducedForBalance: boolean }
  | { type: "run_notice"; reason: RunNoticeReason; message: string };

const RUN_END_NOTICES: Record<RunEnd, string> = {
  turn_limit: USER_FACING_TEXT.turnLimit,
  run_budget: USER_FACING_TEXT.runBudget,
};

const REQUEST_TOO_LARGE_NOTICE: AgentRunEvent = {
  type: "run_notice",
  reason: "request_too_large",
  message: USER_FACING_TEXT.requestTooLarge,
};

const reducedForBalanceSchema = z.object({ maxTokensReducedForBalance: z.literal(true) });
const runIdSchema = z.object({ runId: z.string().uuid() });
const runEndFieldSchema = z.object({ runEnd: runEndSchema });

const CANCELLED_EVENT: AgentRunEvent = {
  type: "error",
  error: "Agent execution cancelled by user",
};

const optionalField = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);

const metricsSchema = z.object({
  inputTokens: z.number(),
  cacheCreationInputTokens: z.number().optional(),
  cacheReadInputTokens: z.number().optional(),
  outputTokens: z.number(),
  costCents: z.number().optional(),
  durationMs: z.number().optional(),
  webSearchRequests: z.number().optional(),
  webSearchCostCents: z.number().optional(),
});

const streamEventSchema = z
  .object({
    type: z.enum([
      "content_delta",
      "thinking_delta",
      "tool_use_start",
      "tool_use",
      "tool_use_complete",
      "done",
      "error",
      "session_created",
      "metrics_update",
      "execution_complete",
      "tool_call_start",
      "tool_call_complete",
      "tool_call_error",
      "web_search_start",
      "web_search_results",
      "web_search_error",
      "citations",
    ]),
    content: optionalField(z.string()),
    delta: optionalField(z.string()),
    id: optionalField(z.string()),
    name: optionalField(toolNameSchema),
    toolUse: optionalField(toolUseSchema),
    error: optionalField(z.string()),
    code: optionalField(z.string()),
    details: z.unknown().transform(parseErrorDetails),
    toolUseId: optionalField(z.string()),
    query: optionalField(z.string()),
    sources: optionalField(
      z.array(z.object({ url: z.string(), title: z.string(), pageAge: z.string().nullable().optional() }))
    ),
    errorCode: optionalField(z.string()),
    citations: optionalField(z.array(z.object({ url: z.string(), title: z.string(), citedText: z.string() }))),
    contentBlocks: optionalField(z.array(contentBlockSchema)),
    stopReason: optionalField(z.string().nullable()),
    usage: optionalField(
      z.object({
        inputTokens: z.number(),
        cacheCreationInputTokens: z.number().optional(),
        cacheReadInputTokens: z.number().optional(),
        outputTokens: z.number(),
        costCents: z.number().optional(),
        webSearchRequests: z.number().optional(),
        webSearchCostCents: z.number().optional(),
      })
    ),
    metrics: optionalField(metricsSchema),
    finalOutput: optionalField(z.string()),
    sessionId: optionalField(z.string()),
    toolCallId: optionalField(z.string()),
    toolName: optionalField(toolNameSchema),
    params: z.unknown(),
    input: optionalField(z.record(z.unknown())),
    result: z.unknown(),
  })
  .passthrough();

function parseStreamEvent(payload: string): AgentStreamEvent | null {
  try {
    const parsed = streamEventSchema.safeParse(JSON.parse(payload));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

type ToolInputCheck = { ok: true; input: Record<string, unknown> } | { ok: false; error: string };

function checkToolInput({ name, input }: { name: ToolName; input: Record<string, unknown> }): ToolInputCheck {
  const schema = toolInputSchemas[name];
  if (!schema) return { ok: true, input };
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, input: parsed.data };
  const fields = parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`);
  return { ok: false, error: `Invalid input for ${name}, so it did not run. ${fields.join("; ")}` };
}

async function* streamAgentChat({
  baseUrl,
  body,
  signal,
}: {
  baseUrl: string;
  body: string;
  signal?: AbortSignal;
}): AsyncGenerator<AgentStreamEvent> {
  const tokenResponse = await chrome.runtime.sendMessage({
    type: "GET_AUTH_TOKEN",
  });
  const token = tokenResponse?.token;

  const url = baseUrl.includes("/api/")
    ? new URL(baseUrl)
    : new URL("/api/agent/chat", baseUrl);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) return;
    throw error;
  }

  if (!response.ok) {
    const errorData = parseErrorBody(await response.json().catch(() => ({})));

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10)
      const remainingHeader = response.headers.get('X-RateLimit-Remaining')

      yield {
        type: "error",
        error: errorData.error || 'Too many requests. Please try again later.',
        code: errorData.code,
        details: {
          ...errorData.details,
          retryAfter,
          ...(remainingHeader !== null && { remaining: parseInt(remainingHeader, 10) }),
        },
      };
    } else {
      if (!errorData.error) {
        logger.error("agent-loop", "HTTP error without a JSON error body", response.status);
      }
      const retryAfterHeader = Number.parseInt(response.headers.get("Retry-After") ?? "", 10);
      const details =
        errorData.details?.retryAfter === undefined && retryAfterHeader > 0
          ? { ...errorData.details, retryAfter: retryAfterHeader }
          : errorData.details;

      yield {
        type: "error",
        error: describeHttpFailure({ status: response.status, body: errorData }),
        code: errorData.code ?? (response.status === 413 ? AGENT_ERROR_CODES.requestTooLarge : undefined),
        details,
      };
    }
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    logger.error("agent-loop", "Response had no body", response.status);
    yield {
      type: "error",
      error: USER_FACING_TEXT.serverUnavailable,
    };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullyRead = false;

  const cancelBody = () => {
    reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", cancelBody, { once: true });

  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (signal?.aborted) return;
        throw error;
      }
      const { done, value } = chunk;
      if (done) {
        fullyRead = true;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = parseStreamEvent(line.slice(6));
          if (data) yield data;
        }
      }
    }

    if (buffer.startsWith("data: ")) {
      const data = parseStreamEvent(buffer.slice(6));
      if (data) yield data;
    }
  } finally {
    signal?.removeEventListener("abort", cancelBody);
    if (!fullyRead) {
      await reader.cancel().catch(() => {});
    }
    reader.releaseLock();
  }
}

export type ToolRunner = (call: { name: ToolName; input: Record<string, unknown> }) => Promise<ToolExecutionResult>;

const runToolViaBackground: ToolRunner = ({ name, input }) => executeToolViaBackground({ toolName: name, toolInput: input });

export type TurnSource = (request: { body: string; signal?: AbortSignal }) => AsyncIterable<AgentStreamEvent>;

export interface RunAgentLoopOptions {
  baseUrl: string;
  chatId: string;
  userMessage: string;
  model?: AgentModel;
  image?: ImageData;
  signal?: AbortSignal;
  enableThinking?: boolean;
  runTool?: ToolRunner;
  openTurn?: TurnSource;
}

export async function* runAgentLoop({
  baseUrl,
  chatId,
  userMessage,
  model = DEFAULT_AGENT_MODEL,
  image,
  signal,
  enableThinking,
  runTool = runToolViaBackground,
  openTurn = (request) => streamAgentChat({ baseUrl, ...request }),
}: RunAgentLoopOptions): AsyncGenerator<AgentRunEvent> {
  const previousTurns: AgentTurn[] = [];
  let turnCount = 0;
  let toolResults: ToolResult[] = [];
  let isFirstRequest = true;
  let runId: string | undefined;
  const maxTurns = MAX_AGENT_TURNS;

  const toolCallHistory: Array<{ name: string; inputHash: string }> = [];

  while (true) {
    if (signal?.aborted) {
      yield CANCELLED_EVENT;
      return;
    }

    turnCount++;
    const streamOptions: StreamAgentChatOptions = {
      chatId,
      model,
      enableThinking,
      ...(image && { image }),
    };

    if (isFirstRequest) {
      streamOptions.userMessage = userMessage;
      isFirstRequest = false;
    } else {
      streamOptions.previousTurns = [...previousTurns];
      if (runId) streamOptions.runId = runId;
    }

    const body = JSON.stringify(streamOptions);
    if (new TextEncoder().encode(body).length > AGENT_SIZE_LIMITS.requestBytes) {
      yield REQUEST_TOO_LARGE_NOTICE;
      return;
    }

    const isContinuation = streamOptions.previousTurns !== undefined;
    const isLastTurn = turnCount === maxTurns;
    let hasToolUse = false;
    let skippedToolCall = false;
    let doneEvent: AgentStreamEvent | undefined;
    let finalAnswer: AgentRunEvent | undefined;
    let serverContent: ContentBlock[] | undefined;
    toolResults = [];
    const assistantContent: ContentBlock[] = [];
    let turnTextContent = "";

    for await (const event of openTurn({ body, signal })) {
      if (signal?.aborted) {
        yield CANCELLED_EVENT;
        return;
      }

      switch (event.type) {
        case "session_created": {
          const sessionRun = runIdSchema.safeParse(event);
          if (sessionRun.success && !runId) runId = sessionRun.data.runId;
          yield {
            type: "session_created",
            sessionId: event.sessionId || chatId,
          };
          break;
        }

        case "content_delta": {
          const delta = event.delta || event.content || "";
          if (delta) {
            turnTextContent += delta;
            yield {
              type: "content_delta",
              delta,
            };
          }
          break;
        }

        case "thinking_delta": {
          const delta = event.delta || "";
          if (delta) {
            yield {
              type: "thinking_delta",
              delta,
            };
          }
          break;
        }

        case "tool_call_start":
          break;

        case "tool_use": {
          let toolUse =
            event.toolUse ||
            (event.id && event.name
              ? {
                  type: "tool_use" as const,
                  id: event.id,
                  name: event.name,
                  input: event.input || {},
                }
              : null);

          if (toolUse && isLastTurn) {
            skippedToolCall = true;
          } else if (toolUse) {
            if (!toolUse.type) {
              toolUse = { ...toolUse, type: "tool_use" };
            }
            hasToolUse = true;

            if (turnTextContent) {
              assistantContent.push({
                type: "text",
                text: turnTextContent,
              });
              turnTextContent = "";
            }

            assistantContent.push(toolUse);

            yield {
              type: "tool_call_start",
              toolName: toolUse.name,
              params: toolUse.input,
              toolCallId: toolUse.id,
            };

            const checked = checkToolInput({ name: toolUse.name, input: toolUse.input });
            if (!checked.ok) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: checked.error,
                is_error: true,
              });
              yield {
                type: "tool_call_error",
                toolName: toolUse.name,
                error: checked.error,
                toolCallId: toolUse.id,
              };
              break;
            }

            try {
              const toolResult = await runTool({ name: toolUse.name, input: checked.input });

              let resultContent: string;
              if (toolResult.success) {
                resultContent =
                  typeof toolResult.data === "string"
                    ? toolResult.data
                    : JSON.stringify(toolResult.data);
              } else {
                resultContent = toolResult.error || "Tool execution failed";
              }

              const toolName = toolUse.name;
              const inputHash = JSON.stringify(toolUse.input);
              const repeatCount = toolCallHistory.filter(
                (t) => t.name === toolName && t.inputHash === inputHash
              ).length;
              toolCallHistory.push({ name: toolName, inputHash });

              if (repeatCount >= 2) {
                resultContent = `[STUCK WARNING: You've called ${toolUse.name} with identical parameters ${repeatCount + 1} times. The page state is likely not changing. Either try a different approach or tell the user what's blocking you.]\n\n${resultContent}`;
              }

              const result: ToolResult = {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: resultContent,
                is_error: !toolResult.success,
              };

              toolResults.push(result);

              yield toolResult.success
                ? {
                    type: "tool_call_complete",
                    toolName: toolUse.name,
                    result: resultContent,
                    toolCallId: toolUse.id,
                  }
                : {
                    type: "tool_call_error",
                    toolName: toolUse.name,
                    error: resultContent,
                    toolCallId: toolUse.id,
                  };
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              // Anthropic rejects the next turn if any tool_use lacks a matching tool_result. https://docs.claude.com/en/docs/agents-and-tools/tool-use/implement-tool-use
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: `Tool execution failed: ${message}`,
                is_error: true,
              });
              yield {
                type: "tool_call_error",
                toolName: toolUse.name,
                error: message,
                toolCallId: toolUse.id,
              };
            }
          }
          break;
        }

        case "metrics_update":
          if (event.metrics) {
            yield { type: "metrics_update", metrics: event.metrics };
          }
          break;

        case "execution_complete":
          finalAnswer = {
            type: "execution_complete",
            finalOutput: event.finalOutput || turnTextContent,
            metrics: event.metrics || { inputTokens: 0, outputTokens: 0 },
          };
          break;

        case "done":
          doneEvent = event;
          if (event.contentBlocks && event.contentBlocks.length > 0) {
            serverContent = event.contentBlocks;
          }
          break;

        case "error":
          if (event.code === AGENT_ERROR_CODES.runSuperseded) {
            yield { type: "run_notice", reason: "superseded", message: USER_FACING_TEXT.runSuperseded };
            return;
          }
          if (event.code === AGENT_ERROR_CODES.requestTooLarge && isContinuation) {
            yield REQUEST_TOO_LARGE_NOTICE;
            return;
          }
          yield {
            type: "error",
            error: event.error || USER_FACING_TEXT.generic,
            code: event.code,
            details: parseErrorDetails(event.details),
          };
          return;

        case "tool_use_start":
        case "tool_use_complete":
        case "tool_call_complete":
        case "tool_call_error":
        case "web_search_start":
        case "web_search_results":
        case "web_search_error":
        case "citations":
          break;
      }
    }

    if (signal?.aborted) {
      yield CANCELLED_EVENT;
      return;
    }

    if (!doneEvent) {
      logger.error("agent-loop", "Stream ended without done or error", { chatId, turnCount });
      yield { type: "error", error: USER_FACING_TEXT.streamCut };
      return;
    }

    const paused = doneEvent.stopReason === "pause_turn";
    const serverRunEnd = runEndFieldSchema.safeParse(doneEvent);
    const wantedMore = paused || skippedToolCall || doneEvent.stopReason === "tool_use";
    const runEnd = serverRunEnd.success
      ? serverRunEnd.data.runEnd
      : isLastTurn && wantedMore
        ? "turn_limit"
        : null;

    if (runEnd || (!hasToolUse && !paused)) {
      if (finalAnswer) yield finalAnswer;
      if (doneEvent.stopReason === "max_tokens") {
        yield {
          type: "output_truncated",
          reducedForBalance: reducedForBalanceSchema.safeParse(doneEvent).success,
        };
      }
      yield { type: "done", usage: doneEvent.usage };
      if (runEnd) yield { type: "run_notice", reason: runEnd, message: RUN_END_NOTICES[runEnd] };
      return;
    }

    if (turnTextContent) {
      assistantContent.push({
        type: "text",
        text: turnTextContent,
      });
    }

    previousTurns.push({ content: serverContent ?? assistantContent, toolResults });
  }
}
