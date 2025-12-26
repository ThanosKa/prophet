import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge to prevent conflicts
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
