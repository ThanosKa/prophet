import { describe, it, expect, afterEach, vi } from 'vitest'
import { AGENT_TOOLS } from './tools'
import { AGENT_MAX_TOKENS } from './system-prompt'
import {
  WEB_SEARCH_TOOL,
  WEB_SEARCH_TOOL_TYPE,
  WEB_SEARCH_MAX_USES,
  buildAgentTools,
  buildOutputConfig,
  buildThinkingConfig,
  AGENT_TURN_MAX_TOKENS,
  getAgentMinTokens,
  isWebSearchEnabled,
  shouldUseWebSearch,
} from './web-search'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Web search tool definition', () => {
  it('uses a tool version every configured model supports', () => {
    expect(WEB_SEARCH_TOOL_TYPE).toBe('web_search_20250305')
    expect(WEB_SEARCH_TOOL.name).toBe('web_search')
  })

  it('caps searches per request', () => {
    expect(WEB_SEARCH_MAX_USES).toBeGreaterThan(0)
    expect(WEB_SEARCH_TOOL).toHaveProperty('max_uses', WEB_SEARCH_MAX_USES)
  })
})

describe('Web search kill switch', () => {
  it('is off when the env flag is unset', () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', '')
    expect(isWebSearchEnabled()).toBe(false)
    expect(shouldUseWebSearch(true)).toBe(false)
  })

  it('stays off for any value other than "true"', () => {
    for (const value of ['1', 'yes', 'TRUE', 'false']) {
      vi.stubEnv('ENABLE_WEB_SEARCH', value)
      expect(isWebSearchEnabled()).toBe(false)
    }
  })

  it('still requires the per-request opt-in when the env flag is on', () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    expect(isWebSearchEnabled()).toBe(true)
    expect(shouldUseWebSearch(false)).toBe(false)
    expect(shouldUseWebSearch(true)).toBe(true)
  })
})

describe('buildAgentTools', () => {
  it('omits web search when the request did not opt in', () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    const tools = buildAgentTools(AGENT_TOOLS, false)
    expect(tools).toHaveLength(AGENT_TOOLS.length)
    expect(tools.some((t) => 'type' in t && t.type === WEB_SEARCH_TOOL_TYPE)).toBe(false)
  })

  it('omits web search when the kill switch is off, even if requested', () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', '')
    const tools = buildAgentTools(AGENT_TOOLS, true)
    expect(tools).toHaveLength(AGENT_TOOLS.length)
  })

  it('appends web search when both the flag and the request allow it', () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    const tools = buildAgentTools(AGENT_TOOLS, true)
    expect(tools).toHaveLength(AGENT_TOOLS.length + 1)
    expect(tools[tools.length - 1]).toBe(WEB_SEARCH_TOOL)
  })

  it('never drops a browser tool', () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    const names = buildAgentTools(AGENT_TOOLS, true).map((t) => t.name)
    for (const tool of AGENT_TOOLS) {
      expect(names).toContain(tool.name)
    }
  })
})

describe('buildThinkingConfig', () => {
  it('sends adaptive thinking with summaries when thinking is on', () => {
    expect(buildThinkingConfig(true)).toEqual({ type: 'adaptive', display: 'summarized' })
  })

  it('omits thinking when it is off: Opus 5.5 / Sonnet 5.5 reject disabled thinking with a 400', () => {
    expect(buildThinkingConfig(false)).toBeNull()
  })

  it('never sends budget_tokens, which every current model rejects', () => {
    for (const enabled of [true, false]) {
      expect(buildThinkingConfig(enabled) ?? {}).not.toHaveProperty('budget_tokens')
    }
  })
})

describe('buildOutputConfig', () => {
  it('runs at low effort when thinking is off', () => {
    expect(buildOutputConfig(false)).toEqual({ effort: 'low' })
  })

  it('leaves effort at the model default when thinking is on', () => {
    expect(buildOutputConfig(true)).toBeNull()
  })
})

describe('agent token limits', () => {
  it('leaves room for the thinking every current model does, even with thinking off', () => {
    expect(AGENT_TURN_MAX_TOKENS).toBe(16000)
    expect(AGENT_TURN_MAX_TOKENS).toBeGreaterThan(getAgentMinTokens(true))
  })

  it('keeps thinking headroom in the low-balance floor only when thinking is on', () => {
    expect(getAgentMinTokens(false)).toBe(AGENT_MAX_TOKENS)
    expect(getAgentMinTokens(true)).toBeGreaterThan(AGENT_MAX_TOKENS)
  })
})
