import { describe, it, expect, afterEach, vi } from 'vitest'
import { CLAUDE_MODELS } from '@prophet/shared'
import { AGENT_TOOLS } from './tools'
import { AGENT_MAX_TOKENS } from './system-prompt'
import {
  WEB_SEARCH_TOOL,
  WEB_SEARCH_TOOL_TYPE,
  WEB_SEARCH_MAX_USES,
  buildAgentTools,
  buildOutputConfig,
  buildThinkingConfig,
  getAgentMaxTokens,
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
  it('sends adaptive thinking on Claude 5 models', () => {
    for (const model of [CLAUDE_MODELS.SONNET, CLAUDE_MODELS.OPUS]) {
      expect(buildThinkingConfig(model, true)).toEqual({
        type: 'adaptive',
        display: 'summarized',
      })
    }
  })

  it('never sends disabled thinking to Opus 5.5 / Sonnet 5.5, which reject it with a 400', () => {
    for (const model of [CLAUDE_MODELS.SONNET, CLAUDE_MODELS.OPUS]) {
      expect(buildThinkingConfig(model, false)).toBeNull()
    }
  })

  it('never sends budget_tokens to a Claude 5 model', () => {
    for (const model of [CLAUDE_MODELS.SONNET, CLAUDE_MODELS.OPUS]) {
      for (const enabled of [true, false]) {
        expect(buildThinkingConfig(model, enabled) ?? {}).not.toHaveProperty('budget_tokens')
      }
    }
  })

  it('keeps the fixed budget on Haiku 4.5', () => {
    const config = buildThinkingConfig(CLAUDE_MODELS.HAIKU, true)
    expect(config).toEqual({ type: 'enabled', budget_tokens: 8000 })
  })

  it('omits the parameter entirely on Haiku 4.5 when thinking is off', () => {
    expect(buildThinkingConfig(CLAUDE_MODELS.HAIKU, false)).toBeNull()
  })
})

describe('buildOutputConfig', () => {
  it('runs Claude 5 models at low effort when thinking is off', () => {
    for (const model of [CLAUDE_MODELS.SONNET, CLAUDE_MODELS.OPUS]) {
      expect(buildOutputConfig({ model, enableThinking: false })).toEqual({ effort: 'low' })
    }
  })

  it('leaves effort at the model default when thinking is on', () => {
    for (const model of [CLAUDE_MODELS.SONNET, CLAUDE_MODELS.OPUS]) {
      expect(buildOutputConfig({ model, enableThinking: true })).toBeNull()
    }
  })

  it('never sends effort to Haiku 4.5', () => {
    for (const enableThinking of [true, false]) {
      expect(buildOutputConfig({ model: CLAUDE_MODELS.HAIKU, enableThinking })).toBeNull()
    }
  })
})

describe('getAgentMaxTokens', () => {
  it('leaves room for thinking on Claude 5 models even when thinking is off', () => {
    for (const model of [CLAUDE_MODELS.SONNET, CLAUDE_MODELS.OPUS]) {
      expect(getAgentMaxTokens({ model, enableThinking: false })).toBe(16000)
    }
  })

  it('keeps the short limit on Haiku 4.5 without thinking', () => {
    expect(getAgentMaxTokens({ model: CLAUDE_MODELS.HAIKU, enableThinking: false })).toBe(AGENT_MAX_TOKENS)
  })
})
