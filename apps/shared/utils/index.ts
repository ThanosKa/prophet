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
 * Credit tier limits (in tokens)
 */
export const TIER_LIMITS = {
  free: 50_000,      // ~$1 worth
  pro: 500_000,      // ~$10 worth
  premium: 1_500_000, // ~$30 worth
  ultra: 3_000_000,   // ~$60 worth
} as const
