import type { AgentChatRequest, AgentTurn } from '@prophet/shared'
import type { RunOpening, RunRequest } from '@/lib/agent/run-record'
import { resolveRunTurns } from '@/lib/agent/conversation'

/**
 * Which request of a Run arrived, by the build generation that sent it. Pure: it reads
 * the validated body once and touches no database, network or log.
 */
export type RequestKind =
  | { kind: 'first'; userMessage: string; runTurns: AgentTurn[]; runId?: string }
  | { kind: 'run'; runId: string; runTurns: AgentTurn[]; sendsWholeRun: boolean }
  | { kind: 'continuation'; runTurns: AgentTurn[] }
  | { kind: 'legacy'; runTurns: AgentTurn[] }

export type RequestKindOrInvalid = RequestKind | { kind: 'invalid' }

/** `invalid` is exactly where the route answers 400 "Either userMessage or toolResults is required". */
export function readRequestKind(data: AgentChatRequest): RequestKindOrInvalid {
  const runTurns = resolveRunTurns(data)
  if (data.userMessage) {
    return {
      kind: 'first',
      userMessage: data.userMessage,
      runTurns,
      ...(data.runId !== undefined ? { runId: data.runId } : {}),
    }
  }
  if (runTurns.length === 0) return { kind: 'invalid' }
  if (data.runId !== undefined) {
    return {
      kind: 'run',
      runId: data.runId,
      runTurns,
      sendsWholeRun: data.previousTurns !== undefined,
    }
  }
  return { kind: data.previousTurns !== undefined ? 'continuation' : 'legacy', runTurns }
}

/**
 * The Turns the previous Turn already sent (and cached), or null when nothing is cached:
 * a first Turn and the legacy form write their whole prompt. An empty array means the
 * previous Turn cached the prompt without any Run Turn.
 */
export function cachedPrefixTurns(kind: RequestKind): AgentTurn[] | null {
  switch (kind.kind) {
    case 'first':
    case 'legacy':
      return null
    case 'continuation':
      return kind.runTurns.slice(0, -1)
    case 'run':
      return kind.sendsWholeRun ? kind.runTurns.slice(0, -1) : null
  }
}

/**
 * The `RunRequest` for this kind. A first Turn needs the opening it just wrote and a
 * `run` the opening it resumed; asking otherwise is a caller bug.
 */
export function toRunRequest({
  kind,
  from,
}: {
  kind: RequestKind
  from: { opened: RunOpening } | { resumed: RunOpening } | null
}): RunRequest {
  switch (kind.kind) {
    case 'first':
      if (from && 'opened' in from) return { type: 'first', opening: from.opened }
      throw new Error('A first Turn needs the opening it opened')
    case 'run':
      if (from && 'resumed' in from) {
        return { type: 'run', opening: from.resumed, turns: kind.runTurns }
      }
      throw new Error('A Run continuation needs the opening it resumed')
    case 'continuation':
      return { type: 'continuation', turns: kind.runTurns }
    case 'legacy':
      return { type: 'legacy', turns: kind.runTurns }
  }
}
