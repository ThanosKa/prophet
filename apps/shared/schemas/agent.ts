import { z } from "zod";

// The Turn limit: the extension's agent loop pauses after this many Turns per Run.
// The server accepts up to this many earlier Turns, so older builds that stop sooner keep working.
export const MAX_AGENT_TURNS = 20;

// Every size limit of an agent Run. The extension caps what it sends; the server's caps
// sit well above them, so only a broken or hostile client ever reaches one.
export const AGENT_SIZE_LIMITS = {
  // Extension caps
  snapshotChars: 20_000,
  snapshotNodeTextChars: 200,
  pageContentChars: 15_000,
  attachedImageChars: 2_000_000,
  // Server caps
  toolResultChars: 200_000,
  textChars: 200_000,
  toolInputJsonChars: 100_000,
  idChars: 256,
  blocksPerTurn: 100,
  toolResultsPerTurn: 100,
  imageChars: 3_000_000,
  // Both: the extension checks before sending, the route answers 413 REQUEST_TOO_LARGE
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
  // Never split a surrogate pair: half an emoji is not valid text.
  const lastKept = content.charCodeAt(cap - 1);
  const kept = lastKept >= 0xd800 && lastKept <= 0xdbff ? cap - 1 : cap;
  return `${content.slice(0, kept)}\n\n[Shortened by the server: this tool result had ${content.length} characters; only the first ${kept} are shown.]`;
}

// Server caps from AGENT_SIZE_LIMITS. The extension's own caps are far lower, so only a
// broken or hostile client reaches one, and it gets a 400 instead of a costly prompt.
const idSchema = z.string().max(AGENT_SIZE_LIMITS.idChars);
const textSchema = z.string().max(AGENT_SIZE_LIMITS.textChars);
// Measured on the JSON text: that is what Claude reads and what every later Turn resends.
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

// The tool input schemas match what each tool does, not stricter: the extension checks a
// tool call against them before it runs, and Claude retries when one fails.

/** The URL the navigate and open_new_tab tools open: they add https:// when there's no http(s) scheme. */
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
  // Negative pixels scroll the other way, and the page stops scrolling at its edge.
  pixels: z.number().optional().default(500),
});

export const searchSnapshotInputSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

// The wait tools clamp every wait to 30 seconds, so any non-negative wait is fine.
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

// Who made a tool call: `{type: "direct"}`, or a server tool such as code execution.
// Open on purpose: an echoed block must reach Anthropic exactly as Claude returned it,
// and a caller type added later must not become a 400 mid-Run.
export const toolCallerSchema = z.object({ type: z.string() }).passthrough();

// An echoed tool call is checked by shape only. Claude already ran it, so a per-tool
// check here could only turn a call the tool definitions allow into a 400 mid-Run.
// The per-tool input schemas above are the extension's check before a tool runs.
export const toolUseSchema = z.object({
  type: z.literal("tool_use"),
  id: idSchema,
  name: toolNameSchema,
  input: toolInputSchema,
  caller: toolCallerSchema.optional(),
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

// Replayed verbatim on the next turn of a run. The API verifies `signature` / `data`,
// so a client cannot forge reasoning, and dropping them would change the prefix.
export const thinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: textSchema,
  signature: textSchema,
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

// One completed request of an agent run: what the model said, then what the tools returned.
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
  // Every earlier turn of the current run, oldest first. Resending them all keeps the
  // conversation append-only, so each request is a prompt-cache hit on the last one.
  previousTurns: z.array(agentTurnSchema).min(1).max(MAX_AGENT_TURNS).optional(),
  // Legacy single-turn form, still sent by already-installed extension builds.
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
