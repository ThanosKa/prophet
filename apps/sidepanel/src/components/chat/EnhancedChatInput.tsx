import { ArrowUp, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
              className={cn(
                "cursor-pointer rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8",
                enableThinking
                  ? "bg-sky-500/15 border-sky-400 text-sky-500"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              title={
                enableThinking
                  ? "Deep thinking enabled"
                  : "Enable deep thinking"
              }
            >
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <Brain
                  className={cn(
                    "w-4 h-4 transition-colors",
                    enableThinking ? "text-sky-500" : "text-inherit"
                  )}
                />
              </div>
              <AnimatePresence>
                {enableThinking && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{
                      width: "auto",
                      opacity: 1,
                    }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm overflow-hidden whitespace-nowrap text-sky-500 flex-shrink-0"
                  >
                    Thinking
                  </motion.span>
                )}
              </AnimatePresence>
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
              className="flex items-center justify-center h-8 w-8 rounded-full bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Stop generating"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-white dark:text-black"
              >
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
            <PromptInputSubmit>
              <ArrowUp className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </PromptInputSubmit>
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
