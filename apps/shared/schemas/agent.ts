import { z } from "zod";
import { keepChars } from "../utils/text";

export const MAX_AGENT_TURNS = 20;
export const LEGACY_MAX_AGENT_TURNS = 10;
export const RUN_BUDGET_TOKENS = 90_000;
export const HISTORY_BUDGET_TOKENS = 20_000;

export const runEndSchema = z.enum(["turn_limit", "run_budget"]);
export type RunEnd = z.infer<typeof runEndSchema>;

export const AGENT_ERROR_CODES = {
  runSuperseded: "RUN_SUPERSEDED",
  requestTooLarge: "REQUEST_TOO_LARGE",
} as const;

export const RUN_SUPERSEDED_MESSAGE = "This chat continued in another panel, so this task stopped here.";

export const AGENT_SIZE_LIMITS = {
  snapshotChars: 20_000,
  snapshotNodeTextChars: 200,
  pageContentChars: 15_000,
  attachedImageChars: 2_000_000,
  toolResultChars: 200_000,
  textChars: 200_000,
  toolInputJsonChars: 100_000,
  idChars: 256,
  blocksPerTurn: 100,
  toolResultsPerTurn: 100,
  imageChars: 3_000_000,
  recordTextChars: 8_000,
  recordActionInputChars: 300,
  requestBytes: 4_000_000,
} as const;

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

/**
 * Cuts a tool result to the server cap and says so. Pure: the same result is cut the same
 * way on every Turn of a Run, so the resent prompt keeps its cached prefix, and an older
 * build's huge snapshot can't end a Run with a 400.
 */
export function shortenToolResult(content: string): string {
  const cap = AGENT_SIZE_LIMITS.toolResultChars;
  if (content.length <= cap) return content;
  const kept = keepChars({ text: content, count: cap });
  return `${kept}\n\n[Shortened by the server: this tool result had ${content.length} characters; only the first ${kept.length} are shown.]`;
}

const idSchema = z.string().max(AGENT_SIZE_LIMITS.idChars);
const textSchema = z.string().max(AGENT_SIZE_LIMITS.textChars);
const toolInputSchema = z
  .record(z.unknown())
  .refine(
    (input) => JSON.stringify(input).length <= AGENT_SIZE_LIMITS.toolInputJsonChars,
    `Tool input is over ${AGENT_SIZE_LIMITS.toolInputJsonChars} characters of JSON`
  );

export const toolResultSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: idSchema,
  content: z.string().transform(shortenToolResult),
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
  text: textSchema,
  citations: z.array(webSearchCitationSchema).nullable().optional(),
});

export const CLAUDE_MODELS = {
  HAIKU: "claude-haiku-5-5",
  SONNET: "claude-sonnet-5-5",
  OPUS: "claude-opus-5-5",
} as const;

export const DEFAULT_AGENT_MODEL = CLAUDE_MODELS.HAIKU;

export const MODEL_CONFIG = [
  {
    id: CLAUDE_MODELS.HAIKU,
    label: 'Haiku 5.5',
    description: 'Fast & efficient',
    contextWindowTokens: 1_000_000,
  },
  {
    id: CLAUDE_MODELS.SONNET,
    label: 'Sonnet 5.5',
    description: 'Balanced',
    contextWindowTokens: 1_000_000,
  },
  {
    id: CLAUDE_MODELS.OPUS,
    label: 'Opus 5.5',
    description: 'Most capable',
    contextWindowTokens: 1_000_000,
  },
] as const;

export type ModelConfig = typeof MODEL_CONFIG[number];

export function getModelContextWindow(model: CurrentAgentModel): number {
  const config = MODEL_CONFIG.find((entry) => entry.id === model);
  if (!config) throw new Error(`No model config for ${model}`);
  return config.contextWindowTokens;
}

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

function isLegacyModelId(
  model: z.infer<typeof agentModelSchema>
): model is keyof typeof LEGACY_MODEL_ALIASES {
  return Object.hasOwn(LEGACY_MODEL_ALIASES, model);
}

export const LEGACY_MODEL_IDS = agentModelSchema.options.filter(isLegacyModelId);

/**
 * Maps a client-supplied model ID to the model the API will actually call.
 * Everything downstream — pricing, credit deduction, usage rows — must use the
 * return value, never the raw request field, or billing drifts from real cost.
 */
export function resolveAgentModel(model: z.infer<typeof agentModelSchema>): CurrentAgentModel {
  if (isLegacyModelId(model)) return LEGACY_MODEL_ALIASES[model];
  return model;
}

export const imageDataSchema = z.object({
  base64: z.string().min(1).max(AGENT_SIZE_LIMITS.imageChars),
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

function opensAsUrl(url: string): boolean {
  const opened = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  try {
    new URL(opened);
    return true;
  } catch {
    return false;
  }
}

const toolUrlSchema = z.string().min(1, "URL is required").refine(opensAsUrl, "Invalid URL");

export const navigateInputSchema = z.object({
  url: toolUrlSchema,
});

export const scrollPageInputSchema = z.object({
  direction: z.enum(["up", "down", "left", "right", "top", "bottom"]),
  pixels: z.number().optional().default(500),
});

export const searchSnapshotInputSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

const waitMsSchema = z.number().min(0);

export const waitForSelectorInputSchema = z.object({
  selector: z.string().min(1, "Selector is required"),
  timeout: waitMsSchema.optional().default(10000),
  visible: z.boolean().optional().default(false),
});

export const waitForNavigationInputSchema = z.object({
  timeout: waitMsSchema.optional().default(30000),
});

export const waitForTimeoutInputSchema = z.object({
  ms: waitMsSchema,
});

export const switchTabInputSchema = z.object({
  tabId: z.number().int(),
});

export const closeTabInputSchema = z.object({
  tabId: z.number().int(),
});

export const openNewTabInputSchema = z.object({
  url: toolUrlSchema,
  active: z.boolean().optional().default(true),
});

export const toolInputSchemas: Partial<
  Record<z.infer<typeof toolNameSchema>, z.ZodType<Record<string, unknown>, z.ZodTypeDef, unknown>>
> = {
  click_element_by_uid: clickElementInputSchema,
  fill_element_by_uid: fillElementInputSchema,
  hover_element_by_uid: hoverElementInputSchema,
  navigate: navigateInputSchema,
  scroll_page: scrollPageInputSchema,
  search_snapshot: searchSnapshotInputSchema,
  wait_for_selector: waitForSelectorInputSchema,
  wait_for_navigation: waitForNavigationInputSchema,
  wait_for_timeout: waitForTimeoutInputSchema,
  switch_tab: switchTabInputSchema,
  close_tab: closeTabInputSchema,
  open_new_tab: openNewTabInputSchema,
};

export const toolCallerSchema = z.object({ type: z.string() }).passthrough();

export const toolUseSchema = z.object({
  type: z.literal("tool_use"),
  id: idSchema,
  name: toolNameSchema,
  input: toolInputSchema,
  caller: toolCallerSchema.optional(),
});

/*
 * Anthropic-executed web search. These blocks arrive inside the assistant turn and
 * must be echoed back byte-for-byte on continuation turns — the API decrypts
 * `encrypted_content` / `encrypted_index` to restore results into Claude's context,
 * and rejects the request if either is missing or altered.
 * https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool
 */
export const WEB_SEARCH_TOOL_NAME = "web_search" as const;

export const webSearchResultSchema = z.object({
  type: z.literal("web_search_result"),
  url: z.string(),
  title: z.string(),
  encrypted_content: textSchema,
  page_age: z.string().nullable().optional(),
});

export const webSearchToolResultErrorSchema = z.object({
  type: z.literal("web_search_tool_result_error"),
  error_code: z.string(),
});

export const serverToolUseSchema = z.object({
  type: z.literal("server_tool_use"),
  id: idSchema,
  name: z.literal(WEB_SEARCH_TOOL_NAME),
  input: toolInputSchema,
  caller: toolCallerSchema.optional(),
});

export const webSearchToolResultSchema = z.object({
  type: z.literal("web_search_tool_result"),
  tool_use_id: idSchema,
  content: z.union([
    z.array(webSearchResultSchema),
    webSearchToolResultErrorSchema,
  ]),
  caller: toolCallerSchema.optional(),
});

export const thinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: textSchema,
  signature: textSchema,
});

export const redactedThinkingBlockSchema = z.object({
  type: z.literal("redacted_thinking"),
  data: textSchema,
});

export const contentBlockSchema = z.union([
  textContentSchema,
  toolUseSchema,
  serverToolUseSchema,
  webSearchToolResultSchema,
  thinkingBlockSchema,
  redactedThinkingBlockSchema,
]);

export const agentTurnSchema = z
  .object({
    content: z.array(contentBlockSchema).min(1).max(AGENT_SIZE_LIMITS.blocksPerTurn),
    toolResults: z.array(toolResultSchema).max(AGENT_SIZE_LIMITS.toolResultsPerTurn),
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
  runId: z.string().uuid().optional(),
  previousTurns: z.array(agentTurnSchema).min(1).max(MAX_AGENT_TURNS).optional(),
  toolResults: z.array(toolResultSchema).max(AGENT_SIZE_LIMITS.toolResultsPerTurn).optional(),
  previousContent: z.array(contentBlockSchema).max(AGENT_SIZE_LIMITS.blocksPerTurn).optional(),
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
