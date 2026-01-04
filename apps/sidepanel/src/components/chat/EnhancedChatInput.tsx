import { ArrowUp, Brain } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextCacheUsage,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { useUIStore } from "@/store/uiStore";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

interface ImageData {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

interface EnhancedChatInputProps {
  onSend: (message: string, image?: ImageData) => void;
  onAbort?: () => void;
  disabled?: boolean;
  placeholder?: string;
  isRunning?: boolean;
}

export function EnhancedChatInput({
  onSend,
  onAbort,
  disabled,
  placeholder = "Ask anything...",
  isRunning = false,
}: EnhancedChatInputProps) {
  const {
    contextTokens,
    contextInputTokens,
    contextOutputTokens,
    contextReasoningTokens,
    contextCachedInputTokens,
    maxContextTokens,
    selectedModel,
    enableThinking,
    toggleThinking,
  } = useUIStore();

  const fileToImageData = async (file: File): Promise<ImageData> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    const base64 = dataUrl.split(",")[1] ?? "";
    return {
      base64,
      mediaType: file.type as ImageData["mediaType"],
    };
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    if (disabled) return;
    const file = message.files?.[0];
    const imageForApi = file ? await fileToImageData(file) : undefined;
    const text =
      message.text && message.text.trim().length > 0
        ? message.text
        : file
        ? "Sent with attachments"
        : "";
    onSend(text, imageForApi);
  };

  return (
    <div className="p-3 bg-[var(--chatbot-bg)] shrink-0">
      <PromptInput
        onSubmit={handleSubmit}
        inputDisabled={disabled}
        submitDisabled={disabled || isRunning}
        globalDrop
        multiple={false}
      >
        <PromptInputHeader>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
        </PromptInputHeader>

        <PromptInputBody>
          <PromptInputTextarea placeholder={placeholder} />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <ModelSelector disabled={disabled} compact />
            <button
              type="button"
              onClick={toggleThinking}
              disabled={disabled}
              className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
                enableThinking
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              } disabled:opacity-50`}
              title={
                enableThinking
                  ? "Deep thinking enabled"
                  : "Enable deep thinking"
              }
            >
              <Brain className="h-3.5 w-3.5" />
            </button>
            <Context
              maxTokens={maxContextTokens}
              modelId={selectedModel}
              usage={{
                inputTokens: contextInputTokens,
                outputTokens: contextOutputTokens,
                totalTokens: contextTokens,
                cachedInputTokens: contextCachedInputTokens,
                reasoningTokens: contextReasoningTokens,
              }}
              usedTokens={contextTokens}
            >
              <ContextTrigger />
              <ContextContent>
                <ContextContentHeader />
                <ContextContentBody>
                  <ContextInputUsage />
                  <ContextOutputUsage />
                  <ContextReasoningUsage />
                  <ContextCacheUsage />
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>
          </PromptInputTools>

          {isRunning ? (
            <button
              type="button"
              onClick={() => onAbort?.()}
              disabled={!onAbort}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-muted hover:bg-muted/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-4 border-border"
              title="Stop generating"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground">
                <rect
                  x="5"
                  y="5"
                  width="14"
                  height="14"
                  rx="2"
                  fill="currentColor"
                />
              </svg>
              <span className="sr-only">Stop</span>
            </button>
          ) : (
            <PromptInputSubmit disabled={disabled}>
              <ArrowUp className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </PromptInputSubmit>
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
