/**
 * Rating prompt trigger logic. Everything here is pure so it can be unit tested;
 * persistence lives in store/reviewPromptStore.ts.
 *
 * Rules:
 * - Ask after the 5th successful run.
 * - "Not now" snoozes the prompt for 10 more successful runs.
 * - "Don't ask again" (and following the review link) opts out for good.
 * - No review gating: nobody is asked "are you happy?" first, and everyone gets the same prompt.
 */

export const EXTENSION_STORE_ID = 'febgdmgcdimmjfkfblbpjmkjfepmfkif'
export const CWS_REVIEWS_URL = `https://chromewebstore.google.com/detail/prophet/${EXTENSION_STORE_ID}/reviews`

export const FIRST_PROMPT_AFTER_RUNS = 5
export const SNOOZE_RUNS = 10
export const REVIEW_PROMPT_STORAGE_KEY = 'prophet-review-prompt'

export interface ReviewPromptState {
  successfulRuns: number
  /** The prompt is due once successfulRuns reaches this number. */
  nextPromptAtRun: number
  optedOut: boolean
}

export const INITIAL_REVIEW_PROMPT_STATE: ReviewPromptState = {
  successfulRuns: 0,
  nextPromptAtRun: FIRST_PROMPT_AFTER_RUNS,
  optedOut: false,
}

export function recordSuccessfulRun(state: ReviewPromptState): ReviewPromptState {
  return { ...state, successfulRuns: state.successfulRuns + 1 }
}

export function shouldShowReviewPrompt(state: ReviewPromptState): boolean {
  return !state.optedOut && state.successfulRuns >= state.nextPromptAtRun
}

export function snoozeReviewPrompt(state: ReviewPromptState): ReviewPromptState {
  return { ...state, nextPromptAtRun: state.successfulRuns + SNOOZE_RUNS }
}

export function optOutOfReviewPrompt(state: ReviewPromptState): ReviewPromptState {
  return { ...state, optedOut: true }
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Validates whatever chrome.storage returned; anything malformed falls back to a fresh state. */
export function parseReviewPromptState(value: unknown): ReviewPromptState {
  if (!isRecord(value)) return INITIAL_REVIEW_PROMPT_STATE
  const { successfulRuns, nextPromptAtRun, optedOut } = value
  if (!isCount(successfulRuns) || !isCount(nextPromptAtRun) || typeof optedOut !== 'boolean') {
    return INITIAL_REVIEW_PROMPT_STATE
  }
  return { successfulRuns, nextPromptAtRun, optedOut }
}
