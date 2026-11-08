/**
 * The `NEXT_PUBLIC_*` values a production build inlines into every bundle. They come
 * from the build machine (process.env or `.env.production.local`), not from the
 * Worker's secrets, so a build without them ships a site that fails only under real
 * traffic. Kept free of app imports: `vite.config.ts` loads it.
 */
const REQUIRED_PUBLIC_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
] as const

type BuildEnv = Record<string, string | undefined>

/**
 * What is wrong with a production build's public values, by name only. A Clerk test key
 * passes only with `ALLOW_CLERK_TEST_KEY=1`, for local previews on placeholder values.
 */
export function publicBuildEnvProblems(env: BuildEnv): string[] {
  const problems: string[] = REQUIRED_PUBLIC_KEYS.filter((key) => !env[key]).map(
    (key) => `${key} is not set`
  )
  const clerkKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (clerkKey && !clerkKey.startsWith('pk_live_') && env.ALLOW_CLERK_TEST_KEY !== '1') {
    problems.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not a live key (pk_live_...)')
  }
  return problems
}

/**
 * Vite plugin that stops a production build whose public values are missing or wrong.
 * It checks in `configResolved`, after vinext has loaded the `.env*` files into `env`.
 */
export function requirePublicBuildEnv({ env = process.env }: { env?: BuildEnv } = {}): {
  name: string
  configResolved: (config: { command: 'build' | 'serve'; mode: string }) => void
} {
  return {
    name: 'prophet:require-public-build-env',
    configResolved(config) {
      if (config.command !== 'build' || config.mode !== 'production') return
      const problems = publicBuildEnvProblems(env)
      if (problems.length === 0) return
      throw new Error(
        `Production build stopped: ${problems.join('; ')}. ` +
          'Put the values in apps/marketing/.env.production.local (see .env.example) and build again.'
      )
    },
  }
}
