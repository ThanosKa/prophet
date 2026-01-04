import { type ToolExecutionResult } from '../types'
import { takeSnapshot, searchSnapshot } from './snapshot'
import { clickElementByUid, fillElementByUid, hoverElementByUid } from './element'
import { navigate, scrollPage, getPageContent, goBack, goForward, reloadPage, getPageInfo } from './page'
import { waitForSelector, waitForNavigation, waitForTimeout } from './wait'
import { listTabs, switchTab, closeTab, openNewTab } from './tabs'

export type ToolExecutor<T = unknown> = (input: T) => Promise<ToolExecutionResult>

export const toolExecutors: Record<string, ToolExecutor<unknown>> = {
  // Observation
  take_snapshot: takeSnapshot,
  search_snapshot: searchSnapshot as ToolExecutor<unknown>,

  // Element Interaction
  click_element_by_uid: clickElementByUid as ToolExecutor<unknown>,
  fill_element_by_uid: fillElementByUid as ToolExecutor<unknown>,
  hover_element_by_uid: hoverElementByUid as ToolExecutor<unknown>,

  // Navigation
  navigate: navigate as ToolExecutor<unknown>,
  go_back: goBack,
  go_forward: goForward,
  reload_page: reloadPage,

  // Page
  scroll_page: scrollPage as ToolExecutor<unknown>,
  get_page_content: getPageContent,
  get_page_info: getPageInfo,

  // Wait
  wait_for_selector: waitForSelector as ToolExecutor<unknown>,
  wait_for_navigation: waitForNavigation as ToolExecutor<unknown>,
  wait_for_timeout: waitForTimeout as ToolExecutor<unknown>,

  // Tabs
  list_tabs: listTabs,
  switch_tab: switchTab as ToolExecutor<unknown>,
  close_tab: closeTab as ToolExecutor<unknown>,
  open_new_tab: openNewTab as ToolExecutor<unknown>,
}

export async function executeTool(
  toolName: string,
  input: unknown
): Promise<ToolExecutionResult> {
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
  // Observation
  takeSnapshot,
  searchSnapshot,
  // Element Interaction
  clickElementByUid,
  fillElementByUid,
  hoverElementByUid,
  // Navigation
  navigate,
  goBack,
  goForward,
  reloadPage,
  // Page
  scrollPage,
  getPageContent,
  getPageInfo,
  // Wait
  waitForSelector,
  waitForNavigation,
  waitForTimeout,
  // Tabs
  listTabs,
  switchTab,
  closeTab,
  openNewTab,
}

