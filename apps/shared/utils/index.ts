// Shared utility functions
// Add utilities here as the project grows

/**
 * Rough token count estimation (1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Sanitize an object for logging by replacing long strings (likely base64) with a placeholder
 */
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
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
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

/**
 * Credit tier limits (in tokens)
 */
export const TIER_LIMITS = {
  free: 50_000,      // ~$1 worth
  pro: 500_000,      // ~$10 worth
  premium: 1_500_000, // ~$30 worth
  ultra: 3_000_000,   // ~$60 worth
} as const
