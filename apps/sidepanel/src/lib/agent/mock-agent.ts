/**
 * Mock Agent Response Generator
 *
 * Simulates agent responses for UI/UX testing without hitting the real API.
 * Use by setting VITE_USE_DEV_API=mock in .env.local
 *
 * Special commands:
 * - Type "/all" to trigger ALL tools sequentially
 * - Type "/snap" to trigger snapshot tools
 * - Type "/nav" to trigger navigation tools
 * - Type "/tabs" to trigger tab tools
 * - Type "/think" to force extended thinking (also triggers with brain toggle)
 * - Any other message picks a random response
 *
 * Extended thinking is simulated when:
 * - The brain toggle is enabled (enableThinking=true)
 * - Or you use the "/think" command
 */

export interface MockAgentEvent {
  type: 'session_created' | 'content_delta' | 'thinking_delta' | 'tool_use' | 'metrics_update' | 'execution_complete' | 'done' | 'error' | 'tool_call_start' | 'tool_call_complete' | 'tool_call_error'
  sessionId?: string
  delta?: string
  toolUse?: {
    type: 'tool_use'
    id: string
    name: string
    input: Record<string, unknown>
  }
  metrics?: {
    inputTokens: number
    outputTokens: number
    costCents: number
  }
  finalOutput?: string
  stopReason?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    costCents: number
  }
  contentBlocks?: Array<{
    type: 'text' | 'tool_use'
    text?: string
    id?: string
    name?: string
    input?: Record<string, unknown>
  }>
  error?: string
  code?: string
  details?: {
    pricingUrl?: string
  }
  toolCallId?: string
  toolName?: string
  params?: Record<string, unknown>
}

// All real tools from the agent
const ALL_TOOLS = [
  // Observation
  'take_snapshot',
  'search_snapshot',
  // Element Interaction
  'click_element_by_uid',
  'fill_element_by_uid',
  'hover_element_by_uid',
  // Navigation
  'navigate',
  'go_back',
  'go_forward',
  'reload_page',
  // Page
  'scroll_page',
  'get_page_content',
  'get_page_info',
  'press_key',
  // Screenshot
  'take_screenshot',
  // Wait
  'wait_for_selector',
  'wait_for_navigation',
  'wait_for_timeout',
  // Tabs
  'list_tabs',
  'switch_tab',
  'close_tab',
  'open_new_tab',
] as const

const TOOL_GROUPS = {
  snap: ['take_snapshot', 'search_snapshot', 'take_screenshot'],
  nav: ['navigate', 'go_back', 'go_forward', 'reload_page', 'scroll_page'],
  tabs: ['list_tabs', 'switch_tab', 'close_tab', 'open_new_tab'],
  element: ['click_element_by_uid', 'fill_element_by_uid', 'hover_element_by_uid'],
  wait: ['wait_for_selector', 'wait_for_navigation', 'wait_for_timeout'],
  page: ['get_page_content', 'get_page_info', 'press_key'],
}

const MOCK_RESPONSES = [
  {
    text: "I'll take a snapshot of the page to understand its structure.",
    tools: ['take_snapshot', 'get_page_info'],
  },
  {
    text: "Let me click that element and fill in the form for you.",
    tools: ['click_element_by_uid', 'fill_element_by_uid'],
  },
  {
    text: "I'll navigate to the page and wait for it to load.",
    tools: ['navigate', 'wait_for_navigation'],
  },
  {
    text: "Let me check what tabs are open and switch to the right one.",
    tools: ['list_tabs', 'switch_tab'],
  },
  {
    text: "I'll scroll down and take a screenshot of the page.",
    tools: ['scroll_page', 'take_screenshot'],
  },
  {
    text: "Here's what I found based on your request.",
    tools: [],
  },
]

/**
 * Simulates a streaming agent response
 */
export async function* mockAgentStream(
  chatId: string,
  userMessage: string,
  _model: string,
  signal?: AbortSignal,
  enableThinking?: boolean
): AsyncGenerator<MockAgentEvent> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const checkAbort = () => {
    if (signal?.aborted) {
      throw new Error('Aborted')
    }
  }

  try {
    // 1. Send session created
    yield {
      type: 'session_created',
      sessionId: chatId,
    }
    await delay(100)
    checkAbort()

    // 2. Determine which tools to use based on message
    const lowerMessage = userMessage.toLowerCase().trim()
    let tools: string[] = []
    let text = ''
    let forceThinking = false

    if (lowerMessage === '/all') {
      tools = [...ALL_TOOLS]
      text = "Testing ALL tools. This will demonstrate every tool in the agent's toolkit."
    } else if (lowerMessage === '/snap') {
      tools = TOOL_GROUPS.snap
      text = "Testing snapshot and screenshot tools."
    } else if (lowerMessage === '/nav') {
      tools = TOOL_GROUPS.nav
      text = "Testing navigation tools."
    } else if (lowerMessage === '/tabs') {
      tools = TOOL_GROUPS.tabs
      text = "Testing tab management tools."
    } else if (lowerMessage === '/element') {
      tools = TOOL_GROUPS.element
      text = "Testing element interaction tools."
    } else if (lowerMessage === '/wait') {
      tools = TOOL_GROUPS.wait
      text = "Testing wait tools."
    } else if (lowerMessage === '/page') {
      tools = TOOL_GROUPS.page
      text = "Testing page content tools."
    } else if (lowerMessage === '/think') {
      forceThinking = true
      tools = ['take_snapshot']
      text = "I've analyzed the page structure after deep consideration."
    } else {
      // Random response
      const responseIndex = Math.floor(Math.random() * MOCK_RESPONSES.length)
      const mockResponse = MOCK_RESPONSES[responseIndex]
      tools = mockResponse.tools
      text = mockResponse.text
    }

    // 2.5 Simulate thinking if enabled
    const shouldThink = enableThinking || forceThinking
    if (shouldThink) {
      const thinkingContent = generateMockThinking(userMessage, tools)
      for (const char of thinkingContent) {
        checkAbort()
        yield {
          type: 'thinking_delta',
          delta: char,
        }
        await delay(Math.random() * 15 + 5) // 5-20ms per character (faster than content)
      }
      await delay(300)
      checkAbort()
    }

    // 3. Stream the text content
    let accumulatedText = ''

    for (const char of text) {
      checkAbort()
      yield {
        type: 'content_delta',
        delta: char,
      }
      accumulatedText += char
      await delay(Math.random() * 30 + 10) // 10-40ms per character (faster for /all)
    }

    await delay(200)
    checkAbort()

    // 4. Simulate tool calls
    const contentBlocks: Array<{
      type: 'text' | 'tool_use'
      text?: string
      id?: string
      name?: string
      input?: Record<string, unknown>
    }> = [
      {
        type: 'text',
        text: accumulatedText,
      },
    ]

    if (tools.length > 0) {
      for (const toolName of tools) {
        checkAbort()
        await delay(300) // Shorter delay for faster testing

        const toolCallId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const toolInput = generateMockToolInput(toolName, userMessage)

        // Emit tool_call_start
        yield {
          type: 'tool_call_start',
          toolCallId,
          toolName,
          params: toolInput,
        }

        await delay(200)
        checkAbort()

        const toolUse = {
          type: 'tool_use' as const,
          id: toolCallId,
          name: toolName,
          input: toolInput,
        }

        contentBlocks.push(toolUse)

        yield {
          type: 'tool_use',
          toolUse,
        }

        await delay(150)
        checkAbort()

        // Emit tool_call_complete
        yield {
          type: 'tool_call_complete',
          toolCallId,
        }
      }
    }

    await delay(200)
    checkAbort()

    // 5. Send metrics update
    const inputTokens = Math.floor(userMessage.length / 3) + 100
    const outputTokens = Math.floor(accumulatedText.length / 3) + 50 + (tools.length * 20)
    const costCents = Math.floor((inputTokens + outputTokens) * 0.001)

    yield {
      type: 'metrics_update',
      metrics: {
        inputTokens,
        outputTokens,
        costCents,
      },
    }

    await delay(100)
    checkAbort()

    // 6. Send execution complete
    yield {
      type: 'execution_complete',
      finalOutput: accumulatedText,
      metrics: {
        inputTokens,
        outputTokens,
        costCents,
      },
    }

    await delay(100)
    checkAbort()

    // 7. Send done
    yield {
      type: 'done',
      stopReason: tools.length > 0 ? 'tool_use' : 'end_turn',
      usage: {
        inputTokens,
        outputTokens,
        costCents,
      },
      contentBlocks,
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Aborted') {
      yield {
        type: 'error',
        error: 'Request aborted',
      }
    } else {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Generate mock thinking content based on user message and tools
 */
function generateMockThinking(userMessage: string, tools: string[]): string {
  const thoughts = [
    `Let me analyze this request: "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"`,
    '',
    'Breaking down the task:',
    '1. First, I need to understand what the user is asking for',
    '2. Then determine which browser actions are needed',
    '3. Finally, execute the actions in the correct order',
    '',
  ]

  if (tools.length > 0) {
    thoughts.push(`I'll need to use ${tools.length} tool(s): ${tools.slice(0, 3).join(', ')}${tools.length > 3 ? '...' : ''}`)
    thoughts.push('')
    thoughts.push('Reasoning through the approach:')
    thoughts.push('- The user wants me to interact with the browser')
    thoughts.push('- I should be careful not to make unnecessary API calls')
    thoughts.push('- Let me proceed with the minimal set of actions needed')
  } else {
    thoughts.push('This appears to be a simple query that I can answer directly.')
    thoughts.push('No browser tools are needed for this response.')
  }

  thoughts.push('')
  thoughts.push('Proceeding with the response...')

  return thoughts.join('\n')
}

/**
 * Generate mock tool input based on tool name
 */
function generateMockToolInput(toolName: string, userMessage: string): Record<string, unknown> {
  switch (toolName) {
    // Observation
    case 'take_snapshot':
      return {}
    case 'search_snapshot':
      return { query: userMessage.slice(0, 30) || 'button' }

    // Element Interaction
    case 'click_element_by_uid':
      return { uid: 'btn_123' }
    case 'fill_element_by_uid':
      return { uid: 'input_456', value: 'test@example.com' }
    case 'hover_element_by_uid':
      return { uid: 'menu_789' }

    // Navigation
    case 'navigate':
      return { url: 'https://example.com' }
    case 'go_back':
      return {}
    case 'go_forward':
      return {}
    case 'reload_page':
      return {}

    // Page
    case 'scroll_page':
      return { direction: 'down', amount: 500 }
    case 'get_page_content':
      return {}
    case 'get_page_info':
      return {}
    case 'press_key':
      return { key: 'Enter' }

    // Screenshot
    case 'take_screenshot':
      return {}

    // Wait
    case 'wait_for_selector':
      return { selector: '#content', timeout: 5000 }
    case 'wait_for_navigation':
      return { timeout: 10000 }
    case 'wait_for_timeout':
      return { ms: 1000 }

    // Tabs
    case 'list_tabs':
      return {}
    case 'switch_tab':
      return { tabId: 12345 }
    case 'close_tab':
      return { tabId: 12345 }
    case 'open_new_tab':
      return { url: 'https://google.com' }

    default:
      return {}
  }
}

/**
 * Mock function to check if mock mode is enabled
 */
export function isMockMode(): boolean {
  return import.meta.env.VITE_USE_DEV_API === 'mock'
}
