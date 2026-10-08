import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import {
  LEGACY_MAX_AGENT_TURNS,
  MAX_AGENT_TURNS,
  RUN_BUDGET_TOKENS,
  type AgentTurn,
} from '@prophet/shared'

/** Why a Turn is its Run's last, as the `done` event's `runEnd` reports it. */
export type RunEnd = 'turn_limit' | 'run_budget'

export const LAST_TURN_NOTICE =
  'This is the last Turn of this Run. Do not call any tools now. ' +
  'Reply to the user with a short summary of what you did and what is left to do, ' +
  'and tell them they can say "continue" to carry on from here.'

/**
 * Decides whether this Turn ends its Run. Requests without a `runId` come from 1.0.5,
 * which stops after `LEGACY_MAX_AGENT_TURNS`. `estimatedPromptTokens` is the Hold's
 * estimate of the prompt without the notice.
 */
export function lastTurnReason({
  runTurns,
  hasRunId,
  estimatedPromptTokens,
}: {
  runTurns: AgentTurn[]
  hasRunId: boolean
  estimatedPromptTokens: number
}): RunEnd | null {
  // A system message can't follow an assistant message, so a `pause_turn` resume (no
  // tool results) leaves the decision to the next Turn that has some.
  const newest = runTurns.at(-1)
  if (!newest || newest.toolResults.length === 0) return null
  if (runTurns.length >= MAX_AGENT_TURNS - 1) return 'turn_limit'
  if (!hasRunId && runTurns.length >= LEGACY_MAX_AGENT_TURNS - 1) return 'turn_limit'
  if (estimatedPromptTokens >= RUN_BUDGET_TOKENS) return 'run_budget'
  return null
}

/**
 * Appends the last-Turn notice after the newest tool results. `tool_choice` and the
 * tools stay as they are: changing either would invalidate the messages cache on the
 * Run's largest prompt.
 */
export function withLastTurnNotice(messages: MessageParam[]): MessageParam[] {
  return [...messages, { role: 'system', content: LAST_TURN_NOTICE }]
}
