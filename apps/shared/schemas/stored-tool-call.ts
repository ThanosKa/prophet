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

/**
 * Keeps the entries of a stored tool-call list that match the schema, so one bad entry
 * never hides the rest; anything but a list reads as no calls.
 */
export function readStoredToolCalls(value: unknown): StoredToolCall[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item: unknown) => {
    const parsed = storedToolCallSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

/** Reads the `tool_calls` text column by the same rule; a column that isn't JSON reads as no calls. */
export function parseStoredToolCalls(column: string | null): StoredToolCall[] {
  if (column === null) return []
  try {
    return readStoredToolCalls(JSON.parse(column))
  } catch {
    return []
  }
}
