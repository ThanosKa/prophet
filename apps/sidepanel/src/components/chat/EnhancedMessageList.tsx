import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ai-elements/shimmer";
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
          <ReasoningTrigger />
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
            Planning next moves
          </Shimmer>
        ) : displayContent ? (
          <MessageResponse>{displayContent}</MessageResponse>
        ) : null}
      </MessageContent>

      {isAssistant && !isStreaming && displayContent && (
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
}: EnhancedMessageListProps) {
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
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
