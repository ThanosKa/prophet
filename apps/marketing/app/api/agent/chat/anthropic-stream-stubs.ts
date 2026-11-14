/**
 * Fake Anthropic streams for tests: the stubbed Turn, its block events and the openable
 * gate. Importing this module mocks nothing and loads neither the database nor the route,
 * so any test can borrow it.
 */

export type ApiBlock = { type: string } & Record<string, unknown>
export type StopReason = 'tool_use' | 'end_turn' | 'max_tokens' | 'refusal' | 'pause_turn'
export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export const text = (value: string): ApiBlock => ({ type: 'text', text: value })

export const toolUse = ({
  id,
  name,
  input,
}: {
  id: string
  name: string
  input: Record<string, unknown>
}): ApiBlock => ({ type: 'tool_use', id, name, input })

/** The stream events Anthropic sends for one finished content block. */
export function* blockEvents({ index, block }: { index: number; block: ApiBlock }) {
  if (block.type === 'tool_use') {
    yield { type: 'content_block_start', index, content_block: { ...block, input: {} } }
    yield {
      type: 'content_block_delta',
      index,
      delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) },
    }
  } else if (block.type === 'text') {
    yield { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }
    yield { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }
  } else {
    yield { type: 'content_block_start', index, content_block: block }
  }
  yield { type: 'content_block_stop', index }
}

/** One streamed text block: start, a single delta, stop. */
export function* textBlockEvents({ index, value }: { index: number; value: string }) {
  yield* blockEvents({ index, block: text(value) })
}

/** One streamed client tool call; `partialJson` lets a test cut the input off mid-way. */
export function* toolUseBlockEvents({
  index,
  id,
  name,
  partialJson,
}: {
  index: number
  id: string
  name: string
  partialJson: string
}) {
  yield { type: 'content_block_start', index, content_block: { type: 'tool_use', id, name, input: {} } }
  yield { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: partialJson } }
  yield { type: 'content_block_stop', index }
}

export const DEFAULT_USAGE: Usage = { input_tokens: 1000, output_tokens: 50 }

/**
 * One Anthropic response: streams `content` (or the given block `events`), then reports
 * `content` from finalMessage(). With a `gate`, the Turn stays in flight until it opens.
 */
export function anthropicTurn({
  content,
  stopReason,
  usage = DEFAULT_USAGE,
  events,
  gate,
}: {
  content: ApiBlock[]
  stopReason: StopReason
  usage?: Usage
  events?: Iterable<Record<string, unknown>>
  gate?: Promise<void>
}) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { ...usage, output_tokens: 1 } } }
      if (events) yield* events
      else for (const [index, block] of content.entries()) yield* blockEvents({ index, block })
      if (gate) await gate
      yield { type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: usage.output_tokens } }
    },
    finalMessage: () =>
      Promise.resolve({
        stop_reason: stopReason,
        ...(stopReason === 'refusal' && {
          stop_details: { type: 'refusal', category: 'cyber', explanation: null },
        }),
        content,
        usage,
      }),
  }
}

export function openableGate(): { gate: Promise<void>; open: () => void } {
  let open = () => {}
  const gate = new Promise<void>((resolve) => {
    open = resolve
  })
  return { gate, open }
}
