import { Copy, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useAgentStore } from "@/store/agentStore";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { ToolCallCollapsible } from "./ToolCallCollapsible";
import type { Message as MessageType, ToolCall } from "@prophet/shared";

interface AgentMessage extends MessageType {
  toolCalls?: ToolCall[];
}

interface EnhancedMessageListProps {
  messages: AgentMessage[];
  isLoading?: boolean;
  isStreaming?: boolean;
  currentToolCall?: ToolCall | null;
  hasMore?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => void;
}

function MessageWithActions({
  message,
  isStreaming,
  currentToolCall,
}: {
  message: AgentMessage;
  isStreaming?: boolean;
  currentToolCall?: ToolCall | null;
}) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";
  const displayContent = message.content;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const isExecutingTool = Boolean(currentToolCall);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Message from={message.role} key={message.id}>
      {isAssistant && (hasToolCalls || isExecutingTool) && (
        <Reasoning isStreaming={isExecutingTool} defaultOpen={isExecutingTool}>
          <ReasoningTrigger
            getThinkingMessage={(isToolStreaming) =>
              isToolStreaming ? (
                <Shimmer duration={1} className="text-sm">
                  Running actions…
                </Shimmer>
              ) : (
                <p>Actions</p>
              )
            }
          />
          <ReasoningContent>
            <div className="space-y-1">
              {message.toolCalls?.map((tc) => (
                <ToolCallCollapsible key={tc.id} toolCall={tc} />
              ))}
              {currentToolCall && (
                <ToolCallCollapsible toolCall={currentToolCall} isExecuting />
              )}
            </div>
          </ReasoningContent>
        </Reasoning>
      )}

      <MessageContent>
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap break-words text-sm">
            {displayContent}
          </p>
        ) : !displayContent && isStreaming ? (
          <Shimmer duration={1.5} className="text-sm">
            Working…
          </Shimmer>
        ) : displayContent ? (
          isStreaming ? (
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground italic">
              {displayContent}
            </p>
          ) : (
            <MessageResponse>{displayContent}</MessageResponse>
          )
        ) : null}
      </MessageContent>

      {!isStreaming && displayContent && (
        <MessageActions>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </MessageActions>
      )}
    </Message>
  );
}

export function EnhancedMessageList({
  messages,
  isLoading,
  isStreaming,
  currentToolCall,
  hasMore,
  isLoadingOlder,
  onLoadOlder,
}: EnhancedMessageListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoadingOlder || !onLoadOlder) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadOlder();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingOlder, onLoadOlder]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Start a conversation
      </div>
    );
  }

  return (
    <Conversation>
      <ConversationContent>
        <div ref={sentinelRef} className="h-1" />
        {isLoadingOlder && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoadingOlder && hasMore && (
          <div className="h-8 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/20" />
          </div>
        )}
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const isLastAssistant = isLast && message.role === "assistant";

          return (
            <MessageWithActions
              key={message.id}
              message={message}
              isStreaming={isLastAssistant && isStreaming}
              currentToolCall={isLastAssistant ? currentToolCall : undefined}
            />
          );
        })}
        {isStreaming && (
          <AgentStatusDisplay />
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

function AgentStatusDisplay() {
  const currentAction = useAgentStore((state) => state.currentAction);
  if (!currentAction) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 mt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
      <span className="text-[11px] font-medium text-muted-foreground/80 tracking-tight italic">
        {currentAction}
      </span>
    </div>
  );
}
