import { useState, useCallback, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import { runAgentLoop } from "@/lib/agent";
import { config } from "@/lib/config";
import type { Message, ToolCall, ImageData } from "@prophet/shared";

export interface AgentMessage extends Message {
  toolCalls?: ToolCall[];
  streamingContent?: string;
}

export function useAgentChat() {
  const { addMessage, updateMessage, setStreaming } = useChatStore();
  const { selectedModel, addContextUsage } = useUIStore();
  const [error, setError] = useState<string | null>(null);
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
            case "content_delta":
              if (event.content) {
                fullContent += event.content;
                updateMessage(chatId, assistantMessageId, {
                  content: fullContent,
                });
              }
              break;

            case "tool_use_start":
              if (event.toolCall) {
                setCurrentToolCall(event.toolCall);
              }
              break;

            case "tool_use_complete":
              if (event.toolCall) {
                toolCalls.push(event.toolCall);
                setCurrentToolCall(null);
              }
              break;

            case "done": {
              updateMessage(chatId, assistantMessageId, {
                content: fullContent,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                inputTokens: event.usage?.inputTokens,
                outputTokens: event.usage?.outputTokens,
              });

              if (event.usage) {
                addContextUsage({
                  inputTokens: event.usage.inputTokens,
                  outputTokens: event.usage.outputTokens,
                });
              }
              break;
            }

            case "error":
              setError(event.error || "Agent execution failed");
              updateMessage(chatId, assistantMessageId, {
                content: event.error || "Agent execution failed",
              });
              break;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Agent error");
      } finally {
        if (activeStreamRef.current?.chatId === chatId) {
          activeStreamRef.current = null;
        }
        setStreaming(false);
        setCurrentToolCall(null);
      }
    },
    [addMessage, updateMessage, setStreaming, selectedModel, addContextUsage]
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
