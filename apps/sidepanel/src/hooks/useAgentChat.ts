import { useState, useCallback, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import { runAgentLoop } from "@/lib/agent";
import { config } from "@/lib/config";
import type { Message, ToolCall, ImageData, AgentStatus } from "@prophet/shared";

export interface AgentMessage extends Message {
  toolCalls?: ToolCall[];
  streamingContent?: string;
}

export function useAgentChat() {
  const { addMessage, updateMessage, setStreaming } = useChatStore();
  const { selectedModel, addContextUsage } = useUIStore();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null);
  const abortRef = useRef<boolean>(false);
  const activeStreamRef = useRef<{ chatId: string; abort: () => void } | null>(
    null
  );

  const sendMessage = useCallback(
    async (chatId: string, content: string, image?: ImageData) => {
      if (
        activeStreamRef.current &&
        activeStreamRef.current.chatId !== chatId
      ) {
        activeStreamRef.current.abort();
      }

      const abortStream = () => {
        abortRef.current = true;
      };
      activeStreamRef.current = { chatId, abort: abortStream };

      try {
        setError(null);
        setStatus("submitted");
        setStreaming(true);
        setCurrentToolCall(null);
        abortRef.current = false;

        const userMessage: AgentMessage = {
          id: crypto.randomUUID(),
          chatId,
          role: "user",
          content: image ? `${content}\n[Image attached]` : content,
          createdAt: new Date(),
        };
        addMessage(chatId, userMessage);

        const assistantMessageId = crypto.randomUUID();
        const assistantPlaceholder: AgentMessage = {
          id: assistantMessageId,
          chatId,
          role: "assistant",
          content: "",
          createdAt: new Date(),
        };
        addMessage(chatId, assistantPlaceholder);

        let fullContent = "";
        const toolCalls: ToolCall[] = [];

        for await (const event of runAgentLoop(
          config.apiUrl,
          chatId,
          content,
          selectedModel,
          image
        )) {
          if (abortRef.current) break;

          switch (event.type) {
            case "session_created":
              // Session tracking if needed
              break;

            case "content_delta":
              setStatus("streaming");
              if (event.delta) {
                fullContent += event.delta;
                updateMessage(chatId, assistantMessageId, {
                  content: fullContent,
                });
              }
              break;

            case "tool_call_start":
              setStatus("executing_tools");
              if (event.toolCallId && event.toolName) {
                setCurrentToolCall({
                  id: event.toolCallId,
                  name: event.toolName,
                  input: event.params as Record<string, unknown>,
                });
              }
              break;

            case "tool_call_complete":
              setStatus("streaming");
              if (event.toolCallId && event.toolName) {
                // Find the existing tool call to keep the input, or use the event data
                toolCalls.push({
                  id: event.toolCallId,
                  name: event.toolName,
                  input: currentToolCall?.id === event.toolCallId ? currentToolCall.input : {},
                  result: event.result as string,
                });
                setCurrentToolCall(null);
              }
              break;

            case "metrics_update":
              if (event.metrics) {
                addContextUsage({
                  inputTokens: event.metrics.inputTokens,
                  outputTokens: event.metrics.outputTokens,
                });
              }
              break;

            case "execution_complete":
              setStatus("idle");
              updateMessage(chatId, assistantMessageId, {
                content: event.finalOutput || fullContent,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                inputTokens: event.metrics?.inputTokens,
                outputTokens: event.metrics?.outputTokens,
              });
              break;

            case "done":
              if (status !== "error") setStatus("idle");
              break;

            case "error":
              setStatus("error");
              setError(event.error || "Agent execution failed");
              updateMessage(chatId, assistantMessageId, {
                content: event.error || "Agent execution failed",
              });
              break;
          }
        }
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Agent error");
      } finally {
        if (activeStreamRef.current?.chatId === chatId) {
          activeStreamRef.current = null;
        }
        setStreaming(false);
        if (status !== "error") setStatus("idle");
        setCurrentToolCall(null);
      }
    },
    [addMessage, updateMessage, setStreaming, selectedModel, addContextUsage, status, currentToolCall]
  );

  const abort = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
      activeStreamRef.current = null;
    }
  }, []);

  return {
    sendMessage,
    abort,
    error,
    setError,
    currentToolCall,
  };
}
