export * from './balance'
export * from './text'

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function truncate({ text, maxLength }: { text: string; maxLength: number }): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function sanitizeForLog(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string' && obj.length > 500) {
      return `[LONG_STRING_TRUNCATED: ${obj.length} chars]`
    }
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLog)
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = `[LONG_STRING_TRUNCATED: ${value.length} chars]`
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}
export * from './attempt'
