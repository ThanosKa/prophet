import { executeToolViaBackground } from "./background-bridge";
import { DEFAULT_AGENT_MODEL } from "@prophet/shared";
import type {
  AgentStreamEvent,
  AgentModel,
  ToolResult,
  ContentBlock,
  ScreenshotResult,
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
}

async function* streamAgentChat(
  baseUrl: string,
  options: StreamAgentChatOptions
): AsyncGenerator<AgentStreamEvent> {
  const tokenResponse = await chrome.runtime.sendMessage({
    type: "GET_AUTH_TOKEN",
  });
  const token = tokenResponse?.token;

  const url = new URL("/api/agent/chat", baseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    yield {
      type: "error",
      error: errorData.error || `HTTP ${response.status}`,
    };
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
  image?: ImageData
): AsyncGenerator<AgentLoopEvent> {
  let previousContent: ContentBlock[] = [];
  let turnCount = 0;
  let toolResults: ToolResult[] = [];
  let isFirstRequest = true;
  const maxTurns = 10;

  while (turnCount < maxTurns) {
    turnCount++;
    const streamOptions: StreamAgentChatOptions = {
      chatId,
      model,
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
    }

    let hasToolUse = false;
    toolResults = []; // Reset for the CURRENT turn only
    const assistantContent: ContentBlock[] = [];
    let turnTextContent = ""; // Text content for this turn only

    for await (const event of streamAgentChat(baseUrl, streamOptions)) {
      switch (event.type) {
        case "session_created":
          yield { type: "session_created", sessionId: event.sessionId || chatId };
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

        case "tool_call_start":
          if (event.toolName && event.toolCallId) {
            yield {
              type: "tool_call_start",
              toolName: event.toolName,
              params: event.params,
              toolCallId: event.toolCallId,
            };
          }
          break;

        case "tool_use": {
          const toolUse = event.toolUse || (event.id && event.name ? {
            type: "tool_use" as const,
            id: event.id,
            name: event.name as ToolName,
            input: event.input || {}
          } : null);

          if (toolUse) {
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
              if (
                toolUse.name === "take_screenshot" &&
                toolResult.success
              ) {
                const screenshot = toolResult.data as ScreenshotResult;
                resultContent = `[Screenshot captured: ${screenshot.mimeType}, base64 data available]`;
              } else if (toolResult.success) {
                resultContent =
                  typeof toolResult.data === "string"
                    ? toolResult.data
                    : JSON.stringify(toolResult.data);
              } else {
                resultContent = toolResult.error || "Tool execution failed";
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
          yield {
            type: "execution_complete",
            finalOutput: event.finalOutput || turnTextContent,
            metrics: event.metrics || { inputTokens: 0, outputTokens: 0 },
          };
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
