import { type ToolExecutionResult } from '../types'
import { takeSnapshot, searchSnapshot } from './snapshot'
import { clickElementByUid, fillElementByUid, hoverElementByUid } from './element'
import { navigate, scrollPage, getPageContent, pressKey } from './page'
import { takeScreenshot } from './screenshot'

export type ToolExecutor<T = unknown> = (input: T) => Promise<ToolExecutionResult>

export const toolExecutors: Record<string, ToolExecutor<unknown>> = {
  take_snapshot: takeSnapshot,
  search_snapshot: searchSnapshot as ToolExecutor<unknown>,
  click_element_by_uid: clickElementByUid as ToolExecutor<unknown>,
  fill_element_by_uid: fillElementByUid as ToolExecutor<unknown>,
  hover_element_by_uid: hoverElementByUid as ToolExecutor<unknown>,
  navigate: navigate as ToolExecutor<unknown>,
  scroll_page: scrollPage as ToolExecutor<unknown>,
  get_page_content: getPageContent,
  press_key: pressKey as ToolExecutor<unknown>,
  take_screenshot: takeScreenshot,
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
  takeSnapshot,
  searchSnapshot,
  clickElementByUid,
  fillElementByUid,
  hoverElementByUid,
  navigate,
  scrollPage,
  getPageContent,
  pressKey,
  takeScreenshot,
}
