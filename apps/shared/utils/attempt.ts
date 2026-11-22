export function attempt(fn: () => unknown): boolean {
  try {
    fn()
    return true
  } catch {
    return false
  }
}

export async function attemptAsync(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn()
    return true
  } catch {
    return false
  }
}
