import { z } from 'zod'
import {
  clickElementInputSchema,
  closeTabInputSchema,
  fillElementInputSchema,
  hoverElementInputSchema,
  navigateInputSchema,
  openNewTabInputSchema,
  scrollPageInputSchema,
  searchSnapshotInputSchema,
  switchTabInputSchema,
  waitForNavigationInputSchema,
  waitForSelectorInputSchema,
  waitForTimeoutInputSchema,
} from '@prophet/shared'
import { type ToolExecutionResult } from '../types'
import { takeSnapshot, searchSnapshot } from './snapshot'
import { clickElementByUid, fillElementByUid, hoverElementByUid } from './element'
import { navigate, scrollPage, getPageContent, goBack, goForward, reloadPage, getPageInfo } from './page'
import { waitForSelector, waitForNavigation, waitForTimeout } from './wait'
import { listTabs, switchTab, closeTab, openNewTab } from './tabs'

export type ToolExecutor<T = unknown> = (input: T) => Promise<ToolExecutionResult>

function validated<T>({
  schema,
  run,
}: {
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
  run: ToolExecutor<T>
}): ToolExecutor<unknown> {
  return async (input) => {
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
      return { success: false, error: `Invalid tool input. ${fields.join('; ')}`, durationMs: 0 }
    }
    return run(parsed.data)
  }
}

function withoutInput(run: ToolExecutor<undefined>): ToolExecutor<unknown> {
  return () => run(undefined)
}

export const toolExecutors: Record<string, ToolExecutor<unknown>> = {
  take_snapshot: takeSnapshot,
  search_snapshot: validated({ schema: searchSnapshotInputSchema, run: searchSnapshot }),

  click_element_by_uid: validated({ schema: clickElementInputSchema, run: clickElementByUid }),
  fill_element_by_uid: validated({ schema: fillElementInputSchema, run: fillElementByUid }),
  hover_element_by_uid: validated({ schema: hoverElementInputSchema, run: hoverElementByUid }),

  navigate: validated({ schema: navigateInputSchema, run: navigate }),
  go_back: withoutInput(goBack),
  go_forward: withoutInput(goForward),
  reload_page: withoutInput(reloadPage),

  scroll_page: validated({ schema: scrollPageInputSchema, run: scrollPage }),
  get_page_content: withoutInput(getPageContent),
  get_page_info: withoutInput(getPageInfo),

  wait_for_selector: validated({ schema: waitForSelectorInputSchema, run: waitForSelector }),
  wait_for_navigation: validated({ schema: waitForNavigationInputSchema, run: waitForNavigation }),
  wait_for_timeout: validated({ schema: waitForTimeoutInputSchema, run: waitForTimeout }),

  list_tabs: listTabs,
  switch_tab: validated({ schema: switchTabInputSchema, run: switchTab }),
  close_tab: validated({ schema: closeTabInputSchema, run: closeTab }),
  open_new_tab: validated({ schema: openNewTabInputSchema, run: openNewTab }),
}

export async function executeTool({
  toolName,
  input,
}: {
  toolName: string
  input: unknown
}): Promise<ToolExecutionResult> {
  const executor = toolExecutors[toolName]

  if (!executor) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
      durationMs: 0,
    }
  }

  try {
    return await executor(input)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to execute tool: ${toolName}`,
      durationMs: 0,
    }
  }
}

export {
  takeSnapshot,
  searchSnapshot,
  clickElementByUid,
  fillElementByUid,
  hoverElementByUid,
  navigate,
  goBack,
  goForward,
  reloadPage,
  scrollPage,
  getPageContent,
  getPageInfo,
  waitForSelector,
  waitForNavigation,
  waitForTimeout,
  listTabs,
  switchTab,
  closeTab,
  openNewTab,
}
