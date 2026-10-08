import { z } from "zod";

export const toolNameSchema = z.enum([
  "take_snapshot",
  "click_element_by_uid",
  "fill_element_by_uid",
  "hover_element_by_uid",
  "navigate",
  "scroll_page",
  "get_page_content",
  "search_snapshot",
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

export const webSearchCitationSchema = z.object({
  type: z.literal("web_search_result_location"),
  url: z.string(),
  title: z.string().nullable().optional(),
  encrypted_index: z.string(),
  cited_text: z.string(),
});

export const textContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  citations: z.array(webSearchCitationSchema).nullable().optional(),
});

// Currently released Claude model IDs. These strings carry no date suffix.
export const CLAUDE_MODELS = {
  HAIKU: "claude-haiku-5-5",
  SONNET: "claude-sonnet-5-5",
  OPUS: "claude-opus-5-5",
} as const;

export const DEFAULT_AGENT_MODEL = CLAUDE_MODELS.HAIKU;

// Consolidated model configuration with labels and descriptions
export const MODEL_CONFIG = [
  {
    id: CLAUDE_MODELS.HAIKU,
    label: 'Haiku 5.5',
    description: 'Fast & efficient',
  },
  {
    id: CLAUDE_MODELS.SONNET,
    label: 'Sonnet 5.5',
    description: 'Balanced',
  },
  {
    id: CLAUDE_MODELS.OPUS,
    label: 'Opus 5.5',
    description: 'Most capable',
  },
] as const;

export type ModelConfig = typeof MODEL_CONFIG[number];

/**
 * Model IDs baked into Chrome extension builds shipped before each model
 * upgrade. Vite inlines MODEL_CONFIG at build time, so every already-installed
 * extension keeps sending these strings. They must stay valid in the request
 * schema — dropping them would 400 every request from the live user base on a
 * server-only deploy — and the API remaps them to the current model.
 *
 * Retire an entry only once telemetry shows no installs still sending it.
 */
export const LEGACY_MODEL_ALIASES = {
  "claude-haiku-4-5": CLAUDE_MODELS.HAIKU,
  "claude-sonnet-5": CLAUDE_MODELS.SONNET,
  "claude-opus-5": CLAUDE_MODELS.OPUS,
  "claude-sonnet-4-6": CLAUDE_MODELS.SONNET,
  "claude-opus-4-6": CLAUDE_MODELS.OPUS,
} as const;

export const LEGACY_MODEL_IDS = Object.keys(
  LEGACY_MODEL_ALIASES
) as Array<keyof typeof LEGACY_MODEL_ALIASES>;

export const currentAgentModelSchema = z.enum([
  CLAUDE_MODELS.HAIKU,
  CLAUDE_MODELS.SONNET,
  CLAUDE_MODELS.OPUS,
]);

export const agentModelSchema = z.enum([
  CLAUDE_MODELS.HAIKU,
  CLAUDE_MODELS.SONNET,
  CLAUDE_MODELS.OPUS,
  "claude-haiku-4-5",
  "claude-sonnet-5",
  "claude-opus-5",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
]);

export type CurrentAgentModel = z.infer<typeof currentAgentModelSchema>;

/**
 * Maps a client-supplied model ID to the model the API will actually call.
 * Everything downstream — pricing, credit deduction, usage rows — must use the
 * return value, never the raw request field, or billing drifts from real cost.
 */
export function resolveAgentModel(model: string): CurrentAgentModel {
  const alias = (LEGACY_MODEL_ALIASES as Record<string, CurrentAgentModel>)[model];
  return alias ?? (model as CurrentAgentModel);
}

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

// Anthropic-executed web search. These blocks arrive inside the assistant turn and
// must be echoed back byte-for-byte on continuation turns — the API decrypts
// `encrypted_content` / `encrypted_index` to restore results into Claude's context,
// and rejects the request if either is missing or altered.
export const WEB_SEARCH_TOOL_NAME = "web_search" as const;

export const webSearchResultSchema = z.object({
  type: z.literal("web_search_result"),
  url: z.string(),
  title: z.string(),
  encrypted_content: z.string(),
  page_age: z.string().nullable().optional(),
});

export const webSearchToolResultErrorSchema = z.object({
  type: z.literal("web_search_tool_result_error"),
  error_code: z.string(),
});

export const serverToolUseSchema = z.object({
  type: z.literal("server_tool_use"),
  id: z.string(),
  name: z.literal(WEB_SEARCH_TOOL_NAME),
  input: z.record(z.unknown()),
});

export const webSearchToolResultSchema = z.object({
  type: z.literal("web_search_tool_result"),
  tool_use_id: z.string(),
  content: z.union([
    z.array(webSearchResultSchema),
    webSearchToolResultErrorSchema,
  ]),
});

// Replayed verbatim on the next turn of a run. The API verifies `signature` / `data`,
// so a client cannot forge reasoning, and dropping them would change the prefix.
export const thinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
  signature: z.string(),
});

export const redactedThinkingBlockSchema = z.object({
  type: z.literal("redacted_thinking"),
  data: z.string(),
});

export const contentBlockSchema = z.union([
  textContentSchema,
  toolUseSchema,
  serverToolUseSchema,
  webSearchToolResultSchema,
  thinkingBlockSchema,
  redactedThinkingBlockSchema,
]);

// The Turn limit: the extension's agent loop pauses after this many Turns per Run.
// The server accepts up to this many earlier Turns, so older builds that stop sooner keep working.
export const MAX_AGENT_TURNS = 20;

// One completed request of an agent run: what the model said, then what the tools returned.
export const agentTurnSchema = z
  .object({
    content: z.array(contentBlockSchema).min(1),
    toolResults: z.array(toolResultSchema),
  })
  .superRefine(({ content, toolResults }, ctx) => {
    const toolUseIds = new Set(
      content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []))
    );
    toolResults.forEach((result, index) => {
      if (!toolUseIds.has(result.tool_use_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tool result does not answer a tool call of this turn",
          path: ["toolResults", index, "tool_use_id"],
        });
      }
    });
  });

export const agentChatRequestSchema = z.object({
  chatId: z.string().uuid("Invalid chat ID"),
  model: agentModelSchema.default(DEFAULT_AGENT_MODEL),
  userMessage: z.string().min(1).max(50000).optional(),
  // Every earlier turn of the current run, oldest first. Resending them all keeps the
  // conversation append-only, so each request is a prompt-cache hit on the last one.
  previousTurns: z.array(agentTurnSchema).min(1).max(MAX_AGENT_TURNS).optional(),
  // Legacy single-turn form, still sent by already-installed extension builds.
  toolResults: z.array(toolResultSchema).optional(),
  previousContent: z.array(contentBlockSchema).optional(),
  image: imageDataSchema.optional(),
  enableThinking: z.boolean().optional().default(false),
  enableWebSearch: z.boolean().optional().default(false),
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
export type WebSearchCitation = z.infer<typeof webSearchCitationSchema>;
export type WebSearchResult = z.infer<typeof webSearchResultSchema>;
export type ServerToolUse = z.infer<typeof serverToolUseSchema>;
export type WebSearchToolResult = z.infer<typeof webSearchToolResultSchema>;
export type AgentModel = z.infer<typeof agentModelSchema>;
export type AgentChatRequest = z.infer<typeof agentChatRequestSchema>;
export type AgentTurn = z.infer<typeof agentTurnSchema>;
export type ClickElementInput = z.infer<typeof clickElementInputSchema>;
export type FillElementInput = z.infer<typeof fillElementInputSchema>;
export type HoverElementInput = z.infer<typeof hoverElementInputSchema>;
export type NavigateInput = z.infer<typeof navigateInputSchema>;
export type ScrollPageInput = z.infer<typeof scrollPageInputSchema>;
export type SearchSnapshotInput = z.infer<typeof searchSnapshotInputSchema>;
export type ImageData = z.infer<typeof imageDataSchema>;
