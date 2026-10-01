import { describe, it, expect } from 'vitest'
import {
  agentChatRequestSchema,
  agentModelSchema,
  contentBlockSchema,
  CLAUDE_MODELS,
  LEGACY_MODEL_ALIASES,
  LEGACY_MODEL_IDS,
  MODEL_CONFIG,
  resolveAgentModel,
  agentInitialMessageSchema,
  agentContinueMessageSchema,
  clickElementInputSchema,
  fillElementInputSchema,
  hoverElementInputSchema,
  navigateInputSchema,
  scrollPageInputSchema,
  searchSnapshotInputSchema,
  toolNameSchema,
  waitForSelectorInputSchema,
  waitForNavigationInputSchema,
  waitForTimeoutInputSchema,
  switchTabInputSchema,
  closeTabInputSchema,
  openNewTabInputSchema,
  toolResultSchema,
  toolUseSchema,
} from './agent'

describe('agentChatRequestSchema', () => {
  it('validates initial request with userMessage', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userMessage: 'Hello',
    }

    const result = agentChatRequestSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates continuation with toolResults + previousContent', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      toolResults: [
        {
          type: 'tool_result',
          tool_use_id: 'tool_123',
          content: 'Success',
          is_error: false,
        },
      ],
      previousContent: [
        {
          type: 'text',
          text: 'Hello',
        },
      ],
    }

    const result = agentChatRequestSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates empty request with just chatId', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
    }

    const result = agentChatRequestSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects chatId that is not a UUID', () => {
    const data = {
      chatId: 'not-a-uuid',
      userMessage: 'Hello',
    }

    const result = agentChatRequestSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Invalid chat ID')
    }
  })

  it('rejects userMessage > 50000 chars', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userMessage: 'a'.repeat(50001),
    }

    const result = agentChatRequestSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('accepts userMessage exactly 50000 chars', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userMessage: 'a'.repeat(50000),
    }

    const result = agentChatRequestSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

describe('agentInitialMessageSchema', () => {
  it('validates valid initial message', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userMessage: 'Hello',
    }

    const result = agentInitialMessageSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects empty userMessage', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userMessage: '',
    }

    const result = agentInitialMessageSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Message is required')
    }
  })

  it('rejects missing userMessage', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
    }

    const result = agentInitialMessageSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('agentContinueMessageSchema', () => {
  it('validates valid continuation message', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      toolResults: [
        {
          type: 'tool_result',
          tool_use_id: 'tool_123',
          content: 'Success',
        },
      ],
      previousContent: [
        {
          type: 'text',
          text: 'Previous response',
        },
      ],
    }

    const result = agentContinueMessageSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects empty toolResults array', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      toolResults: [],
      previousContent: [{ type: 'text', text: 'Hello' }],
    }

    const result = agentContinueMessageSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('At least one tool result required')
    }
  })

  it('rejects empty previousContent array', () => {
    const data = {
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      toolResults: [{ type: 'tool_result', tool_use_id: 'tool_123', content: 'Success' }],
      previousContent: [],
    }

    const result = agentContinueMessageSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Previous content required')
    }
  })
})

describe('clickElementInputSchema', () => {
  it('validates UID only', () => {
    const data = { uid: 'Ab12Cd3E' }

    const result = clickElementInputSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.doubleClick).toBe(false) // Default value
    }
  })

  it('validates UID with doubleClick true', () => {
    const data = { uid: 'Ab12Cd3E', doubleClick: true }

    const result = clickElementInputSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.doubleClick).toBe(true)
    }
  })

  it('validates UID with doubleClick false', () => {
    const data = { uid: 'Ab12Cd3E', doubleClick: false }

    const result = clickElementInputSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.doubleClick).toBe(false)
    }
  })

  it('rejects empty UID', () => {
    const data = { uid: '' }

    const result = clickElementInputSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('UID is required')
    }
  })

  it('rejects missing UID', () => {
    const data = {}

    const result = clickElementInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('fillElementInputSchema', () => {
  it('validates UID and value', () => {
    const data = { uid: 'Ab12Cd3E', value: 'test@example.com' }

    const result = fillElementInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates empty string value', () => {
    const data = { uid: 'Ab12Cd3E', value: '' }

    const result = fillElementInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects missing value', () => {
    const data = { uid: 'Ab12Cd3E' }

    const result = fillElementInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects empty UID', () => {
    const data = { uid: '', value: 'test' }

    const result = fillElementInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('hoverElementInputSchema', () => {
  it('validates UID', () => {
    const data = { uid: 'Ab12Cd3E' }

    const result = hoverElementInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects empty UID', () => {
    const data = { uid: '' }

    const result = hoverElementInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('navigateInputSchema', () => {
  it('validates valid URL', () => {
    const data = { url: 'https://example.com' }

    const result = navigateInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates URL with path', () => {
    const data = { url: 'https://example.com/path/to/page' }

    const result = navigateInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates http URL', () => {
    const data = { url: 'http://localhost:3000' }

    const result = navigateInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects invalid URL', () => {
    const data = { url: 'not-a-url' }

    const result = navigateInputSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid URL')
    }
  })

  it('rejects empty URL', () => {
    const data = { url: '' }

    const result = navigateInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('scrollPageInputSchema', () => {
  it('validates direction only (uses default pixels)', () => {
    const data = { direction: 'down' }

    const result = scrollPageInputSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pixels).toBe(500) // Default
    }
  })

  it('validates all valid directions', () => {
    const directions = ['up', 'down', 'left', 'right', 'top', 'bottom'] as const

    for (const direction of directions) {
      const result = scrollPageInputSchema.safeParse({ direction })
      expect(result.success).toBe(true)
    }
  })

  it('validates direction with custom pixels', () => {
    const data = { direction: 'down', pixels: 1000 }

    const result = scrollPageInputSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pixels).toBe(1000)
    }
  })

  it('rejects invalid direction', () => {
    const data = { direction: 'diagonal' }

    const result = scrollPageInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects negative pixels', () => {
    const data = { direction: 'down', pixels: -100 }

    const result = scrollPageInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects pixels > 10000', () => {
    const data = { direction: 'down', pixels: 10001 }

    const result = scrollPageInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('accepts pixels = 0', () => {
    const data = { direction: 'down', pixels: 0 }

    const result = scrollPageInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('accepts pixels = 10000 (max)', () => {
    const data = { direction: 'down', pixels: 10000 }

    const result = scrollPageInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

describe('searchSnapshotInputSchema', () => {
  it('validates query', () => {
    const data = { query: 'submit button' }

    const result = searchSnapshotInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects empty query', () => {
    const data = { query: '' }

    const result = searchSnapshotInputSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Query is required')
    }
  })

  it('rejects query > 500 chars', () => {
    const data = { query: 'a'.repeat(501) }

    const result = searchSnapshotInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('accepts query exactly 500 chars', () => {
    const data = { query: 'a'.repeat(500) }

    const result = searchSnapshotInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

describe('toolResultSchema', () => {
  it('validates tool result without is_error', () => {
    const data = {
      type: 'tool_result',
      tool_use_id: 'tool_123',
      content: 'Success',
    }

    const result = toolResultSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates tool result with is_error true', () => {
    const data = {
      type: 'tool_result',
      tool_use_id: 'tool_123',
      content: 'Error message',
      is_error: true,
    }

    const result = toolResultSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates tool result with is_error false', () => {
    const data = {
      type: 'tool_result',
      tool_use_id: 'tool_123',
      content: 'Success',
      is_error: false,
    }

    const result = toolResultSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects wrong type', () => {
    const data = {
      type: 'tool_use',
      tool_use_id: 'tool_123',
      content: 'Success',
    }

    const result = toolResultSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('toolUseSchema', () => {
  it('validates tool use', () => {
    const data = {
      type: 'tool_use',
      id: 'tool_123',
      name: 'take_snapshot',
      input: {},
    }

    const result = toolUseSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates tool use with input data', () => {
    const data = {
      type: 'tool_use',
      id: 'tool_123',
      name: 'click_element_by_uid',
      input: { uid: 'Ab12Cd3E', doubleClick: false },
    }

    const result = toolUseSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('validates all valid tool names', () => {
    const validInputByTool: Partial<Record<(typeof toolNameSchema.options)[number], Record<string, unknown>>> = {
      click_element_by_uid: { uid: 'Ab12Cd3E', doubleClick: false } satisfies typeof clickElementInputSchema._type,
      fill_element_by_uid: { uid: 'Ab12Cd3E', value: 'test' } satisfies typeof fillElementInputSchema._type,
      hover_element_by_uid: { uid: 'Ab12Cd3E' } satisfies typeof hoverElementInputSchema._type,
      navigate: { url: 'https://example.com' } satisfies typeof navigateInputSchema._type,
      scroll_page: { direction: 'down', pixels: 500 } satisfies typeof scrollPageInputSchema._type,
      search_snapshot: { query: 'hello' } satisfies typeof searchSnapshotInputSchema._type,
      wait_for_selector: { selector: 'body', timeout: 1000, visible: false } satisfies typeof waitForSelectorInputSchema._type,
      wait_for_navigation: { timeout: 1000 } satisfies typeof waitForNavigationInputSchema._type,
      wait_for_timeout: { ms: 1 } satisfies typeof waitForTimeoutInputSchema._type,
      switch_tab: { tabId: 1 } satisfies typeof switchTabInputSchema._type,
      close_tab: { tabId: 1 } satisfies typeof closeTabInputSchema._type,
      open_new_tab: { url: 'https://example.com', active: true } satisfies typeof openNewTabInputSchema._type,
    }

    for (const name of toolNameSchema.options) {
      const result = toolUseSchema.safeParse({
        type: 'tool_use',
        id: 'tool_123',
        name,
        input: validInputByTool[name] ?? {},
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid tool name', () => {
    const data = {
      type: 'tool_use',
      id: 'tool_123',
      name: 'invalid_tool',
      input: {},
    }

    const result = toolUseSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('Model constants and legacy aliases', () => {
  it('exposes the current Claude model ids', () => {
    expect(CLAUDE_MODELS.HAIKU).toBe('claude-haiku-4-5')
    expect(CLAUDE_MODELS.SONNET).toBe('claude-sonnet-5-5')
    expect(CLAUDE_MODELS.OPUS).toBe('claude-opus-5-5')
  })

  it('MODEL_CONFIG covers exactly the current models', () => {
    expect(MODEL_CONFIG.map((m) => m.id)).toEqual([
      CLAUDE_MODELS.HAIKU,
      CLAUDE_MODELS.SONNET,
      CLAUDE_MODELS.OPUS,
    ])
    for (const entry of MODEL_CONFIG) {
      expect(entry.label.length).toBeGreaterThan(0)
      expect(entry.description.length).toBeGreaterThan(0)
    }
  })

  it('accepts every current model id', () => {
    for (const model of Object.values(CLAUDE_MODELS)) {
      expect(agentModelSchema.safeParse(model).success).toBe(true)
    }
  })

  it('still accepts model ids baked into already-installed extensions', () => {
    for (const legacy of LEGACY_MODEL_IDS) {
      expect(agentModelSchema.safeParse(legacy).success).toBe(true)
    }
  })

  it('rejects unknown model ids', () => {
    expect(agentModelSchema.safeParse('claude-sonnet-4-20250514').success).toBe(false)
    expect(agentModelSchema.safeParse('gpt-4').success).toBe(false)
  })

  it('resolves legacy ids to their current replacement', () => {
    expect(resolveAgentModel('claude-opus-4-6')).toBe(CLAUDE_MODELS.OPUS)
    expect(resolveAgentModel('claude-sonnet-4-6')).toBe(CLAUDE_MODELS.SONNET)
  })

  it('leaves current ids untouched', () => {
    for (const model of Object.values(CLAUDE_MODELS)) {
      expect(resolveAgentModel(model)).toBe(model)
    }
  })

  it('every legacy alias points at a current model', () => {
    const current = Object.values(CLAUDE_MODELS) as string[]
    for (const target of Object.values(LEGACY_MODEL_ALIASES)) {
      expect(current).toContain(target)
    }
  })

  it('a legacy model id passes full request validation and resolves', () => {
    const result = agentChatRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      model: 'claude-opus-4-6',
      userMessage: 'Hello',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(resolveAgentModel(result.data.model)).toBe(CLAUDE_MODELS.OPUS)
    }
  })
})

describe('Web search request flag', () => {
  it('defaults to disabled when omitted', () => {
    const result = agentChatRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userMessage: 'Hello',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.enableWebSearch).toBe(false)
  })

  it('accepts an explicit opt-in', () => {
    const result = agentChatRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userMessage: 'Hello',
      enableWebSearch: true,
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.enableWebSearch).toBe(true)
  })

  it('rejects a non-boolean flag', () => {
    const result = agentChatRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      userMessage: 'Hello',
      enableWebSearch: 'yes',
    })

    expect(result.success).toBe(false)
  })
})

describe('Web search content blocks', () => {
  const searchBlocks = [
    {
      type: 'server_tool_use',
      id: 'srvtoolu_1',
      name: 'web_search',
      input: { query: 'claude pricing' },
    },
    {
      type: 'web_search_tool_result',
      tool_use_id: 'srvtoolu_1',
      content: [
        {
          type: 'web_search_result',
          url: 'https://example.com/a',
          title: 'A',
          encrypted_content: 'EqgfCioIARgBIiQ3',
          page_age: 'April 30, 2026',
        },
      ],
    },
  ]

  it('accepts server tool use and search results in previousContent', () => {
    const result = agentChatRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      previousContent: searchBlocks,
      toolResults: [],
    })

    expect(result.success).toBe(true)
  })

  it('preserves encrypted_content verbatim', () => {
    const result = contentBlockSchema.safeParse(searchBlocks[1])
    expect(result.success).toBe(true)
    if (result.success && result.data.type === 'web_search_tool_result') {
      const content = result.data.content
      expect(Array.isArray(content)).toBe(true)
      if (Array.isArray(content)) {
        expect(content[0].encrypted_content).toBe('EqgfCioIARgBIiQ3')
      }
    }
  })

  it('rejects a search result missing encrypted_content', () => {
    const result = contentBlockSchema.safeParse({
      type: 'web_search_tool_result',
      tool_use_id: 'srvtoolu_1',
      content: [{ type: 'web_search_result', url: 'https://example.com', title: 'A' }],
    })

    expect(result.success).toBe(false)
  })

  it('accepts a web search error result', () => {
    const result = contentBlockSchema.safeParse({
      type: 'web_search_tool_result',
      tool_use_id: 'srvtoolu_1',
      content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' },
    })

    expect(result.success).toBe(true)
  })

  it('accepts text blocks carrying web search citations', () => {
    const result = contentBlockSchema.safeParse({
      type: 'text',
      text: 'Claude Opus 5.5 costs $5 per million input tokens.',
      citations: [
        {
          type: 'web_search_result_location',
          url: 'https://example.com/a',
          title: 'A',
          encrypted_index: 'Eo8BCioIAhgBIiQ',
          cited_text: '$5 per million input tokens',
        },
      ],
    })

    expect(result.success).toBe(true)
  })
})
