import type {
  ContentBlock,
  ContentBlockParam,
  ToolUnion,
} from '@anthropic-ai/sdk/resources/messages'
import { ADAPTIVE_THINKING_MODELS } from '@prophet/shared'
import type { AgentModel } from '@prophet/shared'

/**
 * Anthropic-executed web search.
 *
 * `web_search_20250305` is used for every configured model rather than the newer
 * `web_search_20260209`: the newer version routes searches through code execution
 * (dynamic filtering) by default, which Haiku 4.5 cannot do, and it adds code
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

type ThinkingConfig =
  | { type: 'adaptive'; display: 'summarized' }
  | { type: 'disabled' }
  | { type: 'enabled'; budget_tokens: number }

/**
 * Claude 5 models reject `budget_tokens`, think by default when `thinking` is
 * omitted, and default `display` to `"omitted"` (which streams empty thinking
 * deltas). Both states therefore have to be sent explicitly. Haiku 4.5 predates
 * adaptive thinking and still takes a fixed budget.
 */
export function buildThinkingConfig(
  model: AgentModel,
  enableThinking: boolean
): ThinkingConfig | null {
  if (ADAPTIVE_THINKING_MODELS.includes(model)) {
    return enableThinking
      ? { type: 'adaptive', display: 'summarized' }
      : { type: 'disabled' }
  }
  return enableThinking ? { type: 'enabled', budget_tokens: 8000 } : null
}

const ECHOABLE_BLOCK_TYPES = new Set([
  'text',
  'tool_use',
  'server_tool_use',
  'web_search_tool_result',
])

/**
 * Blocks the client may safely send back as `previousContent`. Thinking blocks are
 * dropped because continuation turns run with thinking off; web search blocks are
 * kept verbatim so their `encrypted_content` still decrypts on the next turn.
 */
export function toEchoableContent(blocks: ContentBlock[]): ContentBlockParam[] {
  return blocks.filter((block) =>
    ECHOABLE_BLOCK_TYPES.has(block.type)
  ) as unknown as ContentBlockParam[]
}
