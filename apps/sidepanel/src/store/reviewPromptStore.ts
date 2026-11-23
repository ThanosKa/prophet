import { attemptAsync } from '@prophet/shared'
import { create } from 'zustand'
import {
  INITIAL_REVIEW_PROMPT_STATE,
  REVIEW_PROMPT_STORAGE_KEY,
  optOutOfReviewPrompt,
  parseReviewPromptState,
  recordSuccessfulRun,
  shouldShowReviewPrompt,
  snoozeReviewPrompt,
  type ReviewPromptState,
} from '@/lib/review-prompt'

async function loadState(): Promise<ReviewPromptState> {
  try {
    const stored = await chrome.storage.local.get(REVIEW_PROMPT_STORAGE_KEY)
    return parseReviewPromptState(stored[REVIEW_PROMPT_STORAGE_KEY])
  } catch {
    return INITIAL_REVIEW_PROMPT_STATE
  }
}

async function saveState(state: ReviewPromptState): Promise<void> {
  await attemptAsync(() => chrome.storage.local.set({ [REVIEW_PROMPT_STORAGE_KEY]: state }))
}

async function update(transform: (state: ReviewPromptState) => ReviewPromptState): Promise<boolean> {
  const next = transform(await loadState())
  await saveState(next)
  return shouldShowReviewPrompt(next)
}

interface ReviewPromptStore {
  visible: boolean
  hydrate: () => Promise<void>
  recordSuccessfulRun: () => Promise<void>
  snooze: () => Promise<void>
  optOut: () => Promise<void>
}

export const useReviewPromptStore = create<ReviewPromptStore>((set) => ({
  visible: false,
  hydrate: async () => set({ visible: shouldShowReviewPrompt(await loadState()) }),
  recordSuccessfulRun: async () => set({ visible: await update(recordSuccessfulRun) }),
  snooze: async () => set({ visible: await update(snoozeReviewPrompt) }),
  optOut: async () => set({ visible: await update(optOutOfReviewPrompt) }),
}))
