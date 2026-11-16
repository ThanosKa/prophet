import { smartLocator } from '../smart-locator'
import { activeTabTool } from './tab-tool'

export const clickElementByUid = activeTabTool<{ uid: string; doubleClick?: boolean }>({
  failure: 'Failed to click element',
  run: async ({ input, tab }) => {
    await smartLocator.click(tab.id, input.uid, input.doubleClick ?? false)
    return { data: `Clicked element with uid="${input.uid}"${input.doubleClick ? ' (double-click)' : ''}` }
  },
})

export const fillElementByUid = activeTabTool<{ uid: string; value: string }>({
  failure: 'Failed to fill element',
  run: async ({ input, tab }) => {
    await smartLocator.fill(tab.id, input.uid, input.value)
    return { data: `Filled element with uid="${input.uid}" with value "${input.value}"` }
  },
})

export const hoverElementByUid = activeTabTool<{ uid: string }>({
  failure: 'Failed to hover over element',
  run: async ({ input, tab }) => {
    await smartLocator.hover(tab.id, input.uid)
    return { data: `Hovered over element with uid="${input.uid}"` }
  },
})
