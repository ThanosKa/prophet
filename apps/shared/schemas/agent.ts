import { z } from "zod";

export const toolNameSchema = z.enum([
  "take_snapshot",
  "click_element_by_uid",
  "fill_element_by_uid",
  "hover_element_by_uid",
  "navigate",
  "take_screenshot",
  "scroll_page",
  "get_page_content",
  "search_snapshot",
  "press_key",
  "wait_for_selector",
  "wait_for_navigation",
  "wait_for_timeout",
  "list_tabs",
  "switch_tab",
  "close_tab",
  "open_new_tab",
  "go_back",
  "go_forward",
  "reload_page",
  "get_page_info",
]);

export const toolResultSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.string(),
  is_error: z.boolean().optional(),
});

export const textContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

// Claude 4.5 model constants
export const CLAUDE_MODELS = {
  HAIKU: "claude-haiku-4-5",
  SONNET: "claude-sonnet-4-5",
  OPUS: "claude-opus-4-5",
} as const;

export const DEFAULT_AGENT_MODEL = CLAUDE_MODELS.HAIKU;

// Consolidated model configuration with labels and descriptions
export const MODEL_CONFIG = [
  {
    id: CLAUDE_MODELS.HAIKU,
    label: 'Haiku 4.5',
    description: 'Fast & efficient',
  },
  {
    id: CLAUDE_MODELS.SONNET,
    label: 'Sonnet 4.5',
    description: 'Balanced',
  },
  {
    id: CLAUDE_MODELS.OPUS,
    label: 'Opus 4.5',
    description: 'Most capable',
  },
] as const;

export type ModelConfig = typeof MODEL_CONFIG[number];

export const agentModelSchema = z.enum([
  CLAUDE_MODELS.HAIKU,
  CLAUDE_MODELS.SONNET,
  CLAUDE_MODELS.OPUS,
]);

export const imageDataSchema = z.object({
  base64: z.string().min(1),
  mediaType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
});

export const clickElementInputSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  doubleClick: z.boolean().optional().default(false),
});

export const fillElementInputSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  value: z.string(),
});

export const hoverElementInputSchema = z.object({
  uid: z.string().min(1, "UID is required"),
});

export const navigateInputSchema = z.object({
  url: z.string().url("Invalid URL"),
});

export const scrollPageInputSchema = z.object({
  direction: z.enum(["up", "down", "left", "right", "top", "bottom"]),
  pixels: z.number().int().min(0).max(10000).optional().default(500),
});

export const searchSnapshotInputSchema = z.object({
  query: z.string().min(1, "Query is required").max(500),
});

export const pressKeyInputSchema = z.object({
  key: z.string().min(1, "Key is required"),
  modifiers: z.array(z.enum(["ctrl", "alt", "shift", "meta"])).optional(),
});

export const waitForSelectorInputSchema = z.object({
  selector: z.string().min(1, "Selector is required"),
  timeout: z.number().int().min(0).max(60000).optional().default(10000),
  visible: z.boolean().optional().default(false),
});

export const waitForNavigationInputSchema = z.object({
  timeout: z.number().int().min(0).max(60000).optional().default(30000),
});

export const waitForTimeoutInputSchema = z.object({
  ms: z.number().int().min(0).max(60000),
});

export const switchTabInputSchema = z.object({
  tabId: z.number().int(),
});

export const closeTabInputSchema = z.object({
  tabId: z.number().int(),
});

export const openNewTabInputSchema = z.object({
  url: z.string().url("Invalid URL"),
  active: z.boolean().optional().default(true),
});

export const toolUseSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: toolNameSchema,
  input: z.record(z.unknown()),
}).superRefine((data, ctx) => {
  const { name, input } = data;
  let schema: z.ZodSchema | null = null;

  switch (name) {
    case "click_element_by_uid": schema = clickElementInputSchema; break;
    case "fill_element_by_uid": schema = fillElementInputSchema; break;
    case "hover_element_by_uid": schema = hoverElementInputSchema; break;
    case "navigate": schema = navigateInputSchema; break;
    case "scroll_page": schema = scrollPageInputSchema; break;
    case "search_snapshot": schema = searchSnapshotInputSchema; break;
    case "press_key": schema = pressKeyInputSchema; break;
    case "wait_for_selector": schema = waitForSelectorInputSchema; break;
    case "wait_for_navigation": schema = waitForNavigationInputSchema; break;
    case "wait_for_timeout": schema = waitForTimeoutInputSchema; break;
    case "switch_tab": schema = switchTabInputSchema; break;
    case "close_tab": schema = closeTabInputSchema; break;
    case "open_new_tab": schema = openNewTabInputSchema; break;
  }

  if (schema) {
    const result = schema.safeParse(input);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ["input", ...issue.path],
        });
      });
    }
  }
});

export const contentBlockSchema = z.union([textContentSchema, toolUseSchema]);

export const agentChatRequestSchema = z.object({
  chatId: z.string().uuid("Invalid chat ID"),
  model: agentModelSchema.default(DEFAULT_AGENT_MODEL),
  userMessage: z.string().min(1).max(50000).optional(),
  toolResults: z.array(toolResultSchema).optional(),
  previousContent: z.array(contentBlockSchema).optional(),
  image: imageDataSchema.optional(),
});

export const agentInitialMessageSchema = z.object({
  chatId: z.string().uuid("Invalid chat ID"),
  userMessage: z
    .string()
    .min(1, "Message is required")
    .max(50000, "Message too long"),
});

export const agentContinueMessageSchema = z.object({
  chatId: z.string().uuid("Invalid chat ID"),
  toolResults: z
    .array(toolResultSchema)
    .min(1, "At least one tool result required"),
  previousContent: z
    .array(contentBlockSchema)
    .min(1, "Previous content required"),
});

export type ToolName = z.infer<typeof toolNameSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;
export type ToolUse = z.infer<typeof toolUseSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type AgentModel = z.infer<typeof agentModelSchema>;
export type AgentChatRequest = z.infer<typeof agentChatRequestSchema>;
export type ClickElementInput = z.infer<typeof clickElementInputSchema>;
export type FillElementInput = z.infer<typeof fillElementInputSchema>;
export type HoverElementInput = z.infer<typeof hoverElementInputSchema>;
export type NavigateInput = z.infer<typeof navigateInputSchema>;
export type ScrollPageInput = z.infer<typeof scrollPageInputSchema>;
export type SearchSnapshotInput = z.infer<typeof searchSnapshotInputSchema>;
export type PressKeyInput = z.infer<typeof pressKeyInputSchema>;
export type ImageData = z.infer<typeof imageDataSchema>;
