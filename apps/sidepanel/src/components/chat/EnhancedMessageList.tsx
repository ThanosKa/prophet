import { Copy, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ToolCallCollapsible } from "./ToolCallCollapsible";
import { useStickToBottomContext } from "use-stick-to-bottom";
import type { Message as MessageType, ToolCall } from "@prophet/shared";
import type { MessagePart, TextPart, ToolPart } from "@/lib/agent/chat-adapter";

interface AgentMessage extends MessageType {
  toolCalls?: ToolCall[];
  thinkingContent?: string;
  parts?: MessagePart[];
}

export interface EnhancedMessageListHandle {
  scrollToBottom: () => void;
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

function ScrollTrigger({ scrollRef }: { scrollRef: React.RefObject<{ scrollToBottom: () => void } | null> }) {
  const { scrollToBottom } = useStickToBottomContext();

  useEffect(() => {
    if (scrollRef.current === null) {
      (scrollRef as React.MutableRefObject<{ scrollToBottom: () => void } | null>).current = { scrollToBottom };
    }
  }, [scrollToBottom, scrollRef]);

  return null;
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
  const hasParts = message.parts && message.parts.length > 0;
  const hasThinking = Boolean(message.thinkingContent);
  // Only show thinking while streaming AND before we have actual content
  const showThinking = hasThinking && isStreaming && !displayContent && !hasParts;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderInlineParts = () => {
    if (!message.parts || message.parts.length === 0) {
      if (!displayContent && isStreaming) {
        return (
          <Shimmer duration={1.5} className="text-sm">
            Working…
          </Shimmer>
        );
      }
      return displayContent ? (
        <MessageResponse>{displayContent}</MessageResponse>
      ) : null;
    }

    return (
      <div className="space-y-2">
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            const textPart = part as TextPart;
            return textPart.text.trim() ? (
              <MessageResponse key={index}>{textPart.text}</MessageResponse>
            ) : null;
          } else {
            const toolPart = part as ToolPart;
            const toolCall: ToolCall = {
              id: toolPart.toolCallId,
              name: toolPart.toolName as ToolCall["name"],
              input: toolPart.input || {},
              result: toolPart.output,
            };
            return (
              <ToolCallCollapsible
                key={toolPart.toolCallId}
                toolCall={toolCall}
                isExecuting={toolPart.state === "executing"}
              />
            );
          }
        })}
        {currentToolCall && !message.parts.some(
          (p) => p.type === "tool" && (p as ToolPart).toolCallId === currentToolCall.id
        ) && (
            <ToolCallCollapsible toolCall={currentToolCall} isExecuting />
          )}
      </div>
    );
  };

  return (
    <Message from={message.role} key={message.id}>
      <MessageContent>
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap break-words text-sm">
            {displayContent}
          </p>
        ) : showThinking ? (
          // Show thinking content while waiting for actual response
          <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground/70">
            {message.thinkingContent}
          </p>
        ) : isAssistant ? (
          hasParts ? (
            renderInlineParts()
          ) : displayContent ? (
            <MessageResponse>{displayContent}</MessageResponse>
          ) : isStreaming ? (
            <Shimmer duration={1.5} className="text-sm">Working…</Shimmer>
          ) : null
        ) : displayContent ? (
          <MessageResponse>{displayContent}</MessageResponse>
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

export const EnhancedMessageList = forwardRef<EnhancedMessageListHandle, EnhancedMessageListProps>(
  function EnhancedMessageList(
    {
      messages,
      isLoading,
      isStreaming,
      currentToolCall,
      hasMore,
      isLoadingOlder,
      onLoadOlder,
    },
    ref
  ) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<{ scrollToBottom: () => void } | null>(null);

    useImperativeHandle(ref, () => ({
      scrollToBottom: () => scrollRef.current?.scrollToBottom(),
    }));

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

    // Skeleton loading for initial fetch
    if (isLoading && messages.length === 0) {
      return (
        <div className="flex-1 flex flex-col justify-end gap-4 p-4 overflow-hidden">
          {/* User message skeleton */}
          <div className="flex justify-end">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-48 ml-auto" />
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          </div>
          {/* Assistant message skeleton */}
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          {/* Another pair */}
          <div className="flex justify-end">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-36 ml-auto" />
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
          {/* One more pair */}
          <div className="flex justify-end">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-40 ml-auto" />
              <Skeleton className="h-4 w-28 ml-auto" />
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          {/* Extra pair for good measure */}
          <div className="flex justify-end">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          {/* One more pair */}
          <div className="flex justify-end">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-40 ml-auto" />
              <Skeleton className="h-4 w-28 ml-auto" />
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-2">
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      );
    }

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
        <ScrollTrigger scrollRef={scrollRef} />
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
          {!isLoadingOlder && !hasMore && messages.length > 0 && (
            <div className="text-center py-3 text-muted-foreground/50 text-xs">
              — Start of conversation —
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
          {isStreaming && <AgentStatusDisplay />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    );
  }
);

function AgentStatusDisplay() {
  const actions = useAgentStore((state) => state.actions);
  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {actions.map((action, i) => (
        <span key={i} className={cn(
          "text-[11px] font-medium tracking-tight flex items-center gap-1.5",
          i === actions.length - 1 ? "text-muted-foreground/90" : "text-muted-foreground/40"
        )}>
          {i === actions.length - 1 ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
          ) : (
            <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          )}
          {action}
        </span>
      ))}
    </div>
  );
}
