import { executeToolViaBackground } from "./background-bridge";
import { DEFAULT_AGENT_MODEL } from "@prophet/shared";
import type {
  AgentStreamEvent,
  AgentModel,
  ToolResult,
  ContentBlock,
  ImageData,
  AgentLoopEvent,
  ToolName,
} from "@prophet/shared";

interface StreamAgentChatOptions {
  chatId: string;
  model: AgentModel;
  userMessage?: string;
  toolResults?: ToolResult[];
  previousContent?: ContentBlock[];
  image?: ImageData;
  enableThinking?: boolean;
}

async function* streamAgentChat(
  baseUrl: string,
  options: StreamAgentChatOptions
): AsyncGenerator<AgentStreamEvent> {
  const tokenResponse = await chrome.runtime.sendMessage({
    type: "GET_AUTH_TOKEN",
  });
  const token = tokenResponse?.token;

  // baseUrl can be full URL like "http://localhost:3000/api/agent/chat/dev"
  // or base URL like "http://localhost:3000" - handle both cases
  const url = baseUrl.includes("/api/")
    ? new URL(baseUrl)
    : new URL("/api/agent/chat", baseUrl);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  /*
  console.log(`[Turn Debug] Sending Turn Request for ${options.chatId}:`, {
    hasUserMessage: !!options.userMessage,
    toolResultsCount: options.toolResults?.length || 0,
    previousContentCount: options.previousContent?.length || 0,
    payload: sanitizeForLog(options)
  });
  */

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10)
      const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10)

      yield {
        type: "error",
        error: errorData.error || 'Too many requests. Please try again later.',
        code: errorData.code,
        details: {
          ...errorData.details,
          retryAfter,
          remaining,
        },
      };
    } else {
      yield {
        type: "error",
        error: errorData.error || `HTTP ${response.status}`,
        code: errorData.code,
        details: errorData.details,
      };
    }
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield {
      type: "error",
      error: "No response body",
    };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6)) as AgentStreamEvent;
            yield data;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    if (buffer.startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.slice(6)) as AgentStreamEvent;
        yield data;
      } catch {
        // Skip malformed JSON
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* runAgentLoop(
  baseUrl: string,
  chatId: string,
  userMessage: string,
  model: AgentModel = DEFAULT_AGENT_MODEL,
  image?: ImageData,
  signal?: AbortSignal,
  enableThinking?: boolean
): AsyncGenerator<AgentLoopEvent> {
  let previousContent: ContentBlock[] = [];
  let turnCount = 0;
  let toolResults: ToolResult[] = [];
  let isFirstRequest = true;
  const maxTurns = 10;

  // Track tool calls to detect repetitive patterns (like Manus does)
  const toolCallHistory: Array<{ name: string; inputHash: string }> = [];

  while (turnCount < maxTurns) {
    if (signal?.aborted) {
      yield {
        type: "error",
        error: "Agent execution cancelled by user",
      };
      return;
    }

    turnCount++;
    const streamOptions: StreamAgentChatOptions = {
      chatId,
      model,
      enableThinking,
    };

    if (isFirstRequest) {
      streamOptions.userMessage = userMessage;
      if (image) {
        streamOptions.image = image;
      }
      isFirstRequest = false;
    } else {
      streamOptions.previousContent = previousContent;
      streamOptions.toolResults = toolResults;
      // Disable thinking on continuation turns - Claude's API requires thinking blocks
      // to be included in previousContent, but we only have text/tool_use blocks
      streamOptions.enableThinking = false;
    }

    let hasToolUse = false;
    toolResults = []; // Reset for the CURRENT turn only
    const assistantContent: ContentBlock[] = [];
    let turnTextContent = ""; // Text content for this turn only

    for await (const event of streamAgentChat(baseUrl, streamOptions)) {
      switch (event.type) {
        case "session_created":
          yield {
            type: "session_created",
            sessionId: event.sessionId || chatId,
          };
          break;

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
          // Ignore server-provided tool_call_start events.
          // We emit tool_call_start deterministically from the corresponding tool_use
          // so the UI always has real params and we avoid duplicate tool rows.
          break;

        case "tool_use": {
          let toolUse =
            event.toolUse ||
            (event.id && event.name
              ? {
                  type: "tool_use" as const,
                  id: event.id,
                  name: event.name as ToolName,
                  input: event.input || {},
                }
              : null);

          if (toolUse) {
            // Ensure the type property is set for message history persistence
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

            // Yield tool_call_start with full params before execution
            yield {
              type: "tool_call_start",
              toolName: toolUse.name,
              params: toolUse.input,
              toolCallId: toolUse.id,
            };

            // Execute the tool immediately via background script
            try {
              const toolResult = await executeToolViaBackground(
                toolUse.name,
                toolUse.input as Record<string, unknown>
              );

              let resultContent: string;
              if (toolResult.success) {
                resultContent =
                  typeof toolResult.data === "string"
                    ? toolResult.data
                    : JSON.stringify(toolResult.data);
              } else {
                resultContent = toolResult.error || "Tool execution failed";
              }

              // Detect repetitive tool calls (context engineering like Manus)
              const toolName = toolUse.name;
              const inputHash = JSON.stringify(toolUse.input);
              const repeatCount = toolCallHistory.filter(
                (t) => t.name === toolName && t.inputHash === inputHash
              ).length;
              toolCallHistory.push({ name: toolName, inputHash });

              // Inject warning if agent is repeating itself
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

              yield {
                type: "tool_call_complete",
                toolName: toolUse.name,
                result: resultContent,
                toolCallId: toolUse.id,
              };
            } catch (error) {
              yield {
                type: "tool_call_error",
                toolName: toolUse.name,
                error: error instanceof Error ? error.message : String(error),
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
          // The backend emits execution_complete at the end of EVERY streamed request/turn.
          // But for tool-use turns, this is not the final assistant answer yet (the loop continues).
          // Emitting execution_complete mid-run causes the UI to "finalize" and then reset on the next turn.
          if (!hasToolUse) {
            yield {
              type: "execution_complete",
              finalOutput: event.finalOutput || turnTextContent,
              metrics: event.metrics || { inputTokens: 0, outputTokens: 0 },
            };
          }
          break;

        case "done":
          if (!hasToolUse) {
            yield {
              type: "done",
              usage: event.usage,
            };
            return;
          }
          break;

        case "error":
          yield {
            type: "error",
            error: event.error || "Unknown error",
          };
          return;
      }
    }

    if (!hasToolUse) {
      return;
    }

    if (turnTextContent) {
      assistantContent.push({
        type: "text",
        text: turnTextContent,
      });
    }

    previousContent = assistantContent;
    // toolResults is already populated from the loop above
  }
}
