import type { ToolName } from '@prophet/shared'
import type { TurnSource, ToolRunner } from './agent-loop'

const ALL_TOOLS: ToolName[] = [
  'take_snapshot',
  'search_snapshot',
  'click_element_by_uid',
  'fill_element_by_uid',
  'hover_element_by_uid',
  'navigate',
  'go_back',
  'go_forward',
  'reload_page',
  'scroll_page',
  'get_page_content',
  'get_page_info',
  'wait_for_selector',
  'wait_for_navigation',
  'wait_for_timeout',
  'list_tabs',
  'switch_tab',
  'close_tab',
  'open_new_tab',
]

const TOOL_GROUPS: Record<'snap' | 'nav' | 'tabs' | 'element' | 'wait' | 'page', ToolName[]> = {
  snap: ['take_snapshot', 'search_snapshot'],
  nav: ['navigate', 'go_back', 'go_forward', 'reload_page', 'scroll_page'],
  tabs: ['list_tabs', 'switch_tab', 'close_tab', 'open_new_tab'],
  element: ['click_element_by_uid', 'fill_element_by_uid', 'hover_element_by_uid'],
  wait: ['wait_for_selector', 'wait_for_navigation', 'wait_for_timeout'],
  page: ['get_page_content', 'get_page_info'],
}

const MOCK_RESPONSES: Array<{ text: string; tools: ToolName[] }> = [
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
    text: "I'll scroll down and analyze the page content.",
    tools: ['scroll_page', 'get_page_content'],
  },
  {
    text: "Here's what I found based on your request.",
    tools: [],
  },
]


interface MockScenario {
  tools: ToolName[]
  text: string
  forceThinking?: boolean
  runEnd?: 'run_budget'
  neverStops?: boolean
}

function pickScenario(userMessage: string): MockScenario {
  switch (userMessage.toLowerCase().trim()) {
    case '/all':
      return { tools: [...ALL_TOOLS], text: "Testing ALL tools. This will demonstrate every tool in the agent's toolkit." }
    case '/snap':
      return { tools: TOOL_GROUPS.snap, text: 'Testing snapshot and screenshot tools.' }
    case '/nav':
      return { tools: TOOL_GROUPS.nav, text: 'Testing navigation tools.' }
    case '/tabs':
      return { tools: TOOL_GROUPS.tabs, text: 'Testing tab management tools.' }
    case '/element':
      return { tools: TOOL_GROUPS.element, text: 'Testing element interaction tools.' }
    case '/wait':
      return { tools: TOOL_GROUPS.wait, text: 'Testing wait tools.' }
    case '/page':
      return { tools: TOOL_GROUPS.page, text: 'Testing page content tools.' }
    case '/think':
      return {
        tools: ['take_snapshot'],
        text: "I've analyzed the page structure after deep consideration.",
        forceThinking: true,
      }
    case '/limit':
      return { tools: ['take_snapshot'], text: 'Testing the turn limit: I will keep asking for a snapshot.', neverStops: true }
    case '/budget':
      return { tools: ['take_snapshot'], text: 'Testing the run budget notice.', runEnd: 'run_budget' }
    default:
      return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
  }
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface MockAdapterOptions {
  userMessage: string
  enableThinking?: boolean
  wait?: (ms: number) => Promise<void>
}

export function createMockAdapters({
  userMessage,
  enableThinking,
  wait = defaultWait,
}: MockAdapterOptions): { openTurn: TurnSource; runTool: ToolRunner } {
  const scenario = pickScenario(userMessage)
  let turnNumber = 0

  const openTurn: TurnSource = async function* () {
    turnNumber++
    const isFirstTurn = turnNumber === 1
    const askForTools = scenario.tools.length > 0 && (isFirstTurn || scenario.neverStops)
    yield { type: 'session_created', sessionId: 'mock' }
    await wait(100)

    if (isFirstTurn && (enableThinking || scenario.forceThinking)) {
      for (const char of generateMockThinking({ userMessage, tools: scenario.tools })) {
        yield { type: 'thinking_delta', delta: char }
        await wait(Math.random() * 15 + 5)
      }
      await wait(300)
    }

    const text = isFirstTurn ? scenario.text : 'Done. Here is what I found based on your request.'
    for (const char of text) {
      yield { type: 'content_delta', delta: char }
      await wait(Math.random() * 30 + 10)
    }
    await wait(200)

    if (askForTools) {
      for (const toolName of scenario.tools) {
        await wait(300)
        yield {
          type: 'tool_use',
          toolUse: {
            type: 'tool_use',
            id: `toolu_mock_${turnNumber}_${toolName}`,
            name: toolName,
            input: generateMockToolInput({ toolName, userMessage }),
          },
        }
      }
    }

    const inputTokens = Math.floor(userMessage.length / 3) + 100
    const outputTokens = Math.floor(text.length / 3) + 50 + (askForTools ? scenario.tools.length * 20 : 0)
    const metrics = { inputTokens, outputTokens, costCents: Math.floor((inputTokens + outputTokens) * 0.001) }
    yield { type: 'metrics_update', metrics }
    yield { type: 'execution_complete', finalOutput: text, metrics }
    yield {
      type: 'done',
      stopReason: askForTools ? 'tool_use' : 'end_turn',
      usage: metrics,
      ...(!askForTools && scenario.runEnd && { runEnd: scenario.runEnd }),
    }
  }

  const runTool: ToolRunner = async ({ name }) => {
    await wait(200)
    return { success: true, data: `Mock result of ${name}`, durationMs: 200 }
  }

  return { openTurn, runTool }
}

function generateMockThinking({ userMessage, tools }: { userMessage: string; tools: string[] }): string {
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

function generateMockToolInput({
  toolName,
  userMessage,
}: {
  toolName: string
  userMessage: string
}): Record<string, unknown> {
  switch (toolName) {
    case 'take_snapshot':
      return {}
    case 'search_snapshot':
      return { query: userMessage.slice(0, 30) || 'button' }

    case 'click_element_by_uid':
      return { uid: 'btn_123' }
    case 'fill_element_by_uid':
      return { uid: 'input_456', value: 'test@example.com' }
    case 'hover_element_by_uid':
      return { uid: 'menu_789' }

    case 'navigate':
      return { url: 'https://example.com' }
    case 'go_back':
      return {}
    case 'go_forward':
      return {}
    case 'reload_page':
      return {}

    case 'scroll_page':
      return { direction: 'down', amount: 500 }
    case 'get_page_content':
      return {}
    case 'get_page_info':
      return {}

    case 'wait_for_selector':
      return { selector: '#content', timeout: 5000 }
    case 'wait_for_navigation':
      return { timeout: 10000 }
    case 'wait_for_timeout':
      return { ms: 1000 }

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
