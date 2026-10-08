export type BoundedBody = { status: 'ok'; text: string } | { status: 'too_large' }

/**
 * Reads a request body as text, refusing it once it passes `maxBytes`. A declared
 * Content-Length over the limit is refused before any byte is read; without one (or
 * with a wrong one) the bytes actually read decide, and reading stops at the limit.
 */
export async function readBodyWithinLimit({
  req,
  maxBytes,
}: {
  req: Request
  maxBytes: number
}): Promise<BoundedBody> {
  const declared = req.headers.get('content-length')
  if (declared !== null && Number(declared) > maxBytes) return { status: 'too_large' }
  if (!req.body) return { status: 'ok', text: '' }

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return { status: 'too_large' }
    }
    chunks.push(value)
  }
  return { status: 'ok', text: new TextDecoder().decode(Buffer.concat(chunks)) }
}

export type ParsedJson = { status: 'ok'; value: unknown } | { status: 'invalid' }

/** Parses a request body that should be JSON, without throwing on one that isn't. */
export function parseJsonBody(text: string): ParsedJson {
  try {
    return { status: 'ok', value: JSON.parse(text) }
  } catch {
    return { status: 'invalid' }
  }
}
