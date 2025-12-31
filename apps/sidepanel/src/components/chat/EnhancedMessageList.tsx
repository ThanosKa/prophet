import { Copy, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useAgentStore } from "@/store/agentStore";
import { cn } from "@/lib/utils";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
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
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
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
      <ConversationEmptyState
        title="Start a conversation"
        description="Ask Prophet anything to get started with your browser tasks."
      />
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
  const actions = useAgentStore((state) => state.actions);
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 px-4 py-4 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {actions.map((action, i) => (
        <div key={i} className="flex items-center gap-2.5 opacity-100 transition-opacity">
          {i === actions.length - 1 ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
          ) : (
            <div className="h-1 w-1 rounded-full bg-muted-foreground/40 ml-1" />
          )}
          <span className={cn(
            "text-[11px] font-medium tracking-tight",
            i === actions.length - 1 ? "text-muted-foreground/90" : "text-muted-foreground/40"
          )}>
            {action}
          </span>
        </div>
      ))}
    </div>
  );
}
