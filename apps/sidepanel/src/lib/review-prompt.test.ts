import { describe, it, expect } from 'vitest'
import {
  FIRST_PROMPT_AFTER_RUNS,
  INITIAL_REVIEW_PROMPT_STATE,
  SNOOZE_RUNS,
  optOutOfReviewPrompt,
  parseReviewPromptState,
  recordSuccessfulRun,
  shouldShowReviewPrompt,
  snoozeReviewPrompt,
  type ReviewPromptState,
} from './review-prompt'

function runsFrom(state: ReviewPromptState, count: number): ReviewPromptState {
  let next = state
  for (let i = 0; i < count; i++) next = recordSuccessfulRun(next)
  return next
}

describe('review prompt trigger', () => {
  it('is hidden for a new install', () => {
    expect(shouldShowReviewPrompt(INITIAL_REVIEW_PROMPT_STATE)).toBe(false)
  })

  it('stays hidden until the 5th successful run, then shows', () => {
    const afterFour = runsFrom(INITIAL_REVIEW_PROMPT_STATE, FIRST_PROMPT_AFTER_RUNS - 1)
    expect(shouldShowReviewPrompt(afterFour)).toBe(false)
    expect(shouldShowReviewPrompt(recordSuccessfulRun(afterFour))).toBe(true)
  })

  it('does not mutate the previous state', () => {
    const next = recordSuccessfulRun(INITIAL_REVIEW_PROMPT_STATE)
    expect(next).not.toBe(INITIAL_REVIEW_PROMPT_STATE)
    expect(INITIAL_REVIEW_PROMPT_STATE.successfulRuns).toBe(0)
  })

  it('"Not now" hides it for 10 more successful runs', () => {
    const due = runsFrom(INITIAL_REVIEW_PROMPT_STATE, FIRST_PROMPT_AFTER_RUNS)
    const snoozed = snoozeReviewPrompt(due)
    expect(shouldShowReviewPrompt(snoozed)).toBe(false)
    expect(shouldShowReviewPrompt(runsFrom(snoozed, SNOOZE_RUNS - 1))).toBe(false)
    expect(shouldShowReviewPrompt(runsFrom(snoozed, SNOOZE_RUNS))).toBe(true)
  })

  it('can be snoozed repeatedly', () => {
    let state = runsFrom(INITIAL_REVIEW_PROMPT_STATE, FIRST_PROMPT_AFTER_RUNS)
    state = snoozeReviewPrompt(state)
    state = snoozeReviewPrompt(runsFrom(state, SNOOZE_RUNS))
    expect(shouldShowReviewPrompt(state)).toBe(false)
    expect(shouldShowReviewPrompt(runsFrom(state, SNOOZE_RUNS))).toBe(true)
  })

  it('"Don\'t ask again" hides it permanently', () => {
    const due = runsFrom(INITIAL_REVIEW_PROMPT_STATE, FIRST_PROMPT_AFTER_RUNS)
    const optedOut = optOutOfReviewPrompt(due)
    expect(shouldShowReviewPrompt(optedOut)).toBe(false)
    expect(shouldShowReviewPrompt(runsFrom(optedOut, 100))).toBe(false)
  })

  it('opting out before the threshold also sticks', () => {
    const state = runsFrom(optOutOfReviewPrompt(INITIAL_REVIEW_PROMPT_STATE), 20)
    expect(shouldShowReviewPrompt(state)).toBe(false)
  })
})

describe('parseReviewPromptState', () => {
  it('round-trips a valid state', () => {
    const state: ReviewPromptState = { successfulRuns: 7, nextPromptAtRun: 17, optedOut: false }
    expect(parseReviewPromptState(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'nope'],
    ['missing fields', { successfulRuns: 3 }],
    ['negative count', { successfulRuns: -1, nextPromptAtRun: 5, optedOut: false }],
    ['fractional count', { successfulRuns: 1.5, nextPromptAtRun: 5, optedOut: false }],
    ['string count', { successfulRuns: '3', nextPromptAtRun: 5, optedOut: false }],
    ['non-boolean optedOut', { successfulRuns: 3, nextPromptAtRun: 5, optedOut: 'yes' }],
  ])('falls back to the initial state for %s', (_label, value) => {
    expect(parseReviewPromptState(value)).toEqual(INITIAL_REVIEW_PROMPT_STATE)
  })
})
