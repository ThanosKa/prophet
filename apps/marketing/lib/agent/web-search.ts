import type {
  ContentBlock,
  ContentBlockParam,
  ToolUnion,
} from '@anthropic-ai/sdk/resources/messages'
import { AGENT_MAX_TOKENS } from './system-prompt'

/**
 * Anthropic-executed web search.
 *
 * `web_search_20250305` is used for every configured model rather than the newer
 * `web_search_20260209`: the newer version routes searches through code execution
 * (dynamic filtering) by default, which Haiku 5.5 does not support, and it adds code
 * execution result blocks that the client agent loop would have to echo back.
 * The basic version emits exactly `server_tool_use` + `web_search_tool_result`
 * on every model, at the cost of not filtering results before they enter context.
 */
export const WEB_SEARCH_TOOL_TYPE = 'web_search_20250305' as const

export const WEB_SEARCH_MAX_USES = 5

export const WEB_SEARCH_TOOL: ToolUnion = {
  type: WEB_SEARCH_TOOL_TYPE,
  name: 'web_search',
  max_uses: WEB_SEARCH_MAX_USES,
}

/**
 * Server-side kill switch. Web search stays dormant until this is set, because
 * the currently shipped extension cannot render `server_tool_use` /
 * `web_search_tool_result` stream blocks — users would be charged per search for
 * output they never see. Flip it only alongside an extension build that handles
 * the `web_search_*` and `citations` SSE events.
 */
export function isWebSearchEnabled(): boolean {
  return process.env.ENABLE_WEB_SEARCH === 'true'
}

export function shouldUseWebSearch(requested: boolean): boolean {
  return requested && isWebSearchEnabled()
}

export function buildAgentTools(
  clientTools: ToolUnion[],
  enableWebSearch: boolean
): ToolUnion[] {
  return shouldUseWebSearch(enableWebSearch)
    ? [...clientTools, WEB_SEARCH_TOOL]
    : clientTools
}

// Headroom for adaptive thinking on top of a full answer when the user turned Thinking on.
const THINKING_HEADROOM_TOKENS = 8000

/**
 * Thinking counts toward `max_tokens`, and every current model thinks even with
 * the toggle off, so every turn gets the thinking-sized limit.
 */
export const AGENT_TURN_MAX_TOKENS = 16000

/**
 * Every current model (Haiku 5.5, Sonnet 5.5, Opus 5.5) thinks adaptively when
 * `thinking` is omitted, and Opus 5.5 and Sonnet 5.5 reject `{type: "disabled"}`
 * with a 400, so "thinking off" means omitting the field and running at low effort
 * (`buildOutputConfig`). `display` defaults to `"omitted"` (empty thinking deltas),
 * so thinking-on asks for summaries explicitly.
 */
export function buildThinkingConfig(
  enableThinking: boolean
): { type: 'adaptive'; display: 'summarized' } | null {
  return enableThinking ? { type: 'adaptive', display: 'summarized' } : null
}

export function buildOutputConfig(enableThinking: boolean): { effort: 'low' } | null {
  return enableThinking ? null : { effort: 'low' }
}

/**
 * Smallest `max_tokens` a low balance may shrink a turn to: one full non-thinking
 * answer, plus thinking headroom when thinking was requested. Below this, turns
 * tend to end mid-`tool_use` or inside thinking with no answer.
 */
export function getAgentMinTokens(enableThinking: boolean): number {
  return enableThinking ? THINKING_HEADROOM_TOKENS + AGENT_MAX_TOKENS : AGENT_MAX_TOKENS
}

const ECHOABLE_BLOCK_TYPES = new Set([
  'thinking',
  'redacted_thinking',
  'text',
  'tool_use',
  'server_tool_use',
  'web_search_tool_result',
])

/**
 * Blocks the client sends back unchanged in `previousTurns`. Thinking blocks are kept
 * because a tool-use turn with thinking on must replay them, and an append-only run
 * history keeps every request a prompt-cache hit; web search blocks are kept verbatim
 * so their `encrypted_content` still decrypts on the next turn.
 */
export function toEchoableContent(blocks: ContentBlock[]): ContentBlockParam[] {
  return blocks.filter((block) =>
    ECHOABLE_BLOCK_TYPES.has(block.type)
  ) as unknown as ContentBlockParam[]
}
