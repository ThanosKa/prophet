import { z } from 'zod'

/**
 * One tool call of a Run as `messages.tool_calls` stores it: a call the server released
 * to the extension, with `isError` once its result came back as an error. Fields are
 * picked explicitly, so echoed extras such as `caller` are never stored, and tool
 * results never are.
 */
export const storedToolCallSchema = z.object({
  type: z.literal('tool_use'),
  id: z.string(),
  // Not the tool-name enum: a renamed tool must not hide a stored Run's calls.
  name: z.string(),
  input: z.record(z.unknown()),
  isError: z.boolean().optional(),
})

export type StoredToolCall = z.infer<typeof storedToolCallSchema>

/** Reads the `tool_calls` text column; anything but a valid list reads as no calls. */
export function parseStoredToolCalls(column: string | null): StoredToolCall[] {
  if (column === null) return []
  let json: unknown
  try {
    json = JSON.parse(column)
  } catch {
    return []
  }
  const parsed = z.array(storedToolCallSchema).safeParse(json)
  return parsed.success ? parsed.data : []
}
