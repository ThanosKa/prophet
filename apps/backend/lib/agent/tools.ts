import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'take_snapshot',
    description: `Take an accessibility tree snapshot of the current browser tab. Returns a structured tree of all interactive elements on the page, each with a unique UID that can be used for subsequent interactions.

IMPORTANT: Always call this tool first before attempting to interact with elements. The snapshot shows:
- Interactive elements (buttons, links, inputs, etc.)
- Their roles, names, and current values
- Unique UIDs for targeting elements

Example output format:
uid=Ab12Cd3E button "Submit" <button>
uid=Xy98Zw7V textbox "Email" value="user@example.com" <input>
  uid=Mn45Op6Q link "Forgot password?" <a>`,
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'click_element_by_uid',
    description: `Click an element by its UID from the most recent snapshot.

IMPORTANT: You must call take_snapshot first to get the UID of the element you want to click.

Use cases:
- Click buttons to submit forms
- Click links to navigate
- Click checkboxes or radio buttons
- Click any interactive element

If the element is not visible, it will be scrolled into view first.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        uid: {
          type: 'string',
          description: 'The unique ID of the element from the snapshot (e.g., "Ab12Cd3E")',
        },
        doubleClick: {
          type: 'boolean',
          description: 'Whether to double-click instead of single-click. Default: false',
        },
      },
      required: ['uid'],
    },
  },
  {
    name: 'fill_element_by_uid',
    description: `Fill a text input or textarea with a value, using its UID from the snapshot.

IMPORTANT: You must call take_snapshot first to get the UID of the element.

This tool:
1. Focuses the element
2. Clears any existing value
3. Types the new value
4. Triggers appropriate input events

Works with:
- Text inputs
- Password inputs
- Textareas
- Search boxes
- Email inputs
- Number inputs`,
    input_schema: {
      type: 'object' as const,
      properties: {
        uid: {
          type: 'string',
          description: 'The unique ID of the input element from the snapshot',
        },
        value: {
          type: 'string',
          description: 'The text value to fill into the input',
        },
      },
      required: ['uid', 'value'],
    },
  },
  {
    name: 'hover_element_by_uid',
    description: `Hover over an element by its UID to trigger hover states or reveal hidden menus.

Use cases:
- Reveal dropdown menus
- Show tooltips
- Trigger hover effects`,
    input_schema: {
      type: 'object' as const,
      properties: {
        uid: {
          type: 'string',
          description: 'The unique ID of the element from the snapshot',
        },
      },
      required: ['uid'],
    },
  },
  {
    name: 'navigate',
    description: `Navigate the browser to a specific URL.

Use cases:
- Go to a website by URL
- Navigate to a specific page
- Open a new URL

The page will load and you should call take_snapshot afterward to see the new page content.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to navigate to (e.g., "https://example.com")',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'take_screenshot',
    description: `Take a screenshot of the current browser tab.

Returns a base64-encoded image of the visible portion of the page. Useful for:
- Verifying visual state
- Capturing page content
- Debugging interaction issues`,
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'scroll_page',
    description: `Scroll the current page in a specified direction.

Use when:
- Content is below the visible area
- Need to see more of the page
- Element might be off-screen

After scrolling, call take_snapshot to see the newly visible elements.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right', 'top', 'bottom'],
          description: 'Direction to scroll. "top" and "bottom" scroll to the very top/bottom of the page.',
        },
        pixels: {
          type: 'number',
          description: 'Number of pixels to scroll (ignored for "top"/"bottom"). Default: 500',
        },
      },
      required: ['direction'],
    },
  },
  {
    name: 'get_page_content',
    description: `Extract the text content of the current page.

Returns:
- Page URL
- Page title
- Main text content (cleaned, no HTML)

Useful for:
- Reading article content
- Understanding page context
- Extracting information without needing to parse the snapshot`,
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_snapshot',
    description: `Search the current snapshot for elements matching a text query.

Returns matching elements with their UIDs, roles, and context. Useful when:
- Looking for a specific button or link
- Finding elements by text content
- Narrowing down from a large snapshot`,
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Text to search for (case-insensitive, partial match)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'press_key',
    description: `Press a keyboard key, optionally with modifiers.

Use for:
- Pressing Enter to submit
- Keyboard shortcuts (Ctrl+A, Cmd+C, etc.)
- Tab to move between fields
- Escape to close modals

Common keys: Enter, Tab, Escape, Backspace, Delete, ArrowUp, ArrowDown, ArrowLeft, ArrowRight`,
    input_schema: {
      type: 'object' as const,
      properties: {
        key: {
          type: 'string',
          description: 'The key to press (e.g., "Enter", "Tab", "Escape", "a", "A")',
        },
        modifiers: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['ctrl', 'alt', 'shift', 'meta'],
          },
          description: 'Modifier keys to hold. "meta" is Cmd on Mac, Win on Windows.',
        },
      },
      required: ['key'],
    },
  },
]

export function getToolByName(name: string): Tool | undefined {
  return AGENT_TOOLS.find((tool) => tool.name === name)
}

export const TOOL_NAMES = AGENT_TOOLS.map((tool) => tool.name)
