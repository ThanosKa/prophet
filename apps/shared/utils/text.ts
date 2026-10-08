/**
 * Keeps at most `count` UTF-16 units from the start (or the end) of `text`, one fewer
 * when the cut would split a surrogate pair: half an emoji is not valid text.
 */
export function keepChars({
  text,
  count,
  from = 'start',
}: {
  text: string
  count: number
  from?: 'start' | 'end'
}): string {
  if (text.length <= count) return text
  if (count <= 0) return ''
  if (from === 'start') {
    const head = text.slice(0, count)
    return isHighSurrogate(head.charCodeAt(head.length - 1)) ? head.slice(0, -1) : head
  }
  const tail = text.slice(-count)
  return isLowSurrogate(tail.charCodeAt(0)) ? tail.slice(1) : tail
}

/** The message of anything thrown, for logs: an Error's message, or the value as text. */
export function errorMessage(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown)
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff
}
