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
import { selectMaxContextTokens, useUIStore } from "@/store/uiStore";
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
  type FileCheck,
} from "@/components/ai-elements/prompt-input";
import { AGENT_SIZE_LIMITS, imageDataSchema, type ImageData } from "@prophet/shared";
import { USER_FACING_TEXT } from "@/lib/user-facing-errors";

// Resolving to false means the message was not sent, so the input keeps the draft.
export type OnSend = (message: string, image?: ImageData) => void | Promise<boolean | void>;

/** Refuses an image at attach time rather than starting a Run the server would reject. */
function checkAttachedImage(file: File): FileCheck {
  if (!imageDataSchema.shape.mediaType.safeParse(file.type).success) {
    return { ok: false, message: USER_FACING_TEXT.imageTypeUnsupported };
  }
  // Base64 turns every 3 bytes (rounded up) into 4 characters
  const base64Chars = Math.ceil(file.size / 3) * 4;
  if (base64Chars > AGENT_SIZE_LIMITS.attachedImageChars) {
    return { ok: false, message: USER_FACING_TEXT.imageTooLargeToAttach };
  }
  return { ok: true };
}

async function fileToImageData(file: File): Promise<ImageData | null> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Failed to read file"));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
  const parsed = imageDataSchema.safeParse({
    base64: dataUrl.split(",")[1] ?? "",
    mediaType: file.type,
  });
  return parsed.success ? parsed.data : null;
}

interface EnhancedChatInputProps {
  onSend: OnSend;
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
    selectedModel,
    enableThinking,
    toggleThinking,
  } = useUIStore();

  const handleSubmit = async (message: PromptInputMessage) => {
    if (disabled) return;
    const file = message.files?.[0];
    const imageForApi = file ? await fileToImageData(file) : undefined;
    // Attach-time checks make this rare; keep the draft rather than send without the image
    if (imageForApi === null) return false;
    const text =
      message.text && message.text.trim().length > 0
        ? message.text
        : file
        ? "Sent with attachments"
        : "";
    return onSend(text, imageForApi);
  };

  return (
    <div className="p-3 bg-[var(--chatbot-bg)] shrink-0">
      <PromptInput
        onSubmit={handleSubmit}
        inputDisabled={disabled}
        submitDisabled={disabled || isRunning}
        globalDrop
        multiple={false}
        validateFile={checkAttachedImage}
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
              maxTokens={selectMaxContextTokens({ selectedModel })}
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
