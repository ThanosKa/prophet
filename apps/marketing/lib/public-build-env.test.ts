import { describe, expect, it } from 'vitest'
import { publicBuildEnvProblems, requirePublicBuildEnv } from './public-build-env'

const COMPLETE = {
  NEXT_PUBLIC_APP_URL: 'https://prophetchrome.com',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_Y2xlcmsucHJvcGhldGNocm9tZS5jb20k',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/account',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/account',
}

describe('publicBuildEnvProblems', () => {
  it('finds nothing wrong with the six public values and a live Clerk key', () => {
    expect(publicBuildEnvProblems(COMPLETE)).toEqual([])
  })

  it('names every missing or empty public value', () => {
    const env = { ...COMPLETE, NEXT_PUBLIC_APP_URL: undefined, NEXT_PUBLIC_CLERK_SIGN_IN_URL: '' }

    expect(publicBuildEnvProblems(env)).toEqual([
      'NEXT_PUBLIC_APP_URL is not set',
      'NEXT_PUBLIC_CLERK_SIGN_IN_URL is not set',
    ])
  })

  it('refuses a Clerk test key, which would sign every extension user out', () => {
    const env = { ...COMPLETE, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk' }

    expect(publicBuildEnvProblems(env)).toEqual([
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not a live key (pk_live_...)',
    ])
  })

  it('accepts a Clerk test key only when a local preview build asks for it', () => {
    const env = {
      ...COMPLETE,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk',
      ALLOW_CLERK_TEST_KEY: '1',
    }

    expect(publicBuildEnvProblems(env)).toEqual([])
  })

  it('never prints a value', () => {
    const env = { ...COMPLETE, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_do-not-print-me' }

    expect(publicBuildEnvProblems(env).join(' ')).not.toContain('do-not-print-me')
  })
})

describe('requirePublicBuildEnv', () => {
  const resolved = (command: 'build' | 'serve', mode: string) => ({ command, mode })

  it('stops a production build that lacks a public value', () => {
    const plugin = requirePublicBuildEnv({ env: { ...COMPLETE, NEXT_PUBLIC_APP_URL: undefined } })

    expect(() => plugin.configResolved(resolved('build', 'production'))).toThrow('NEXT_PUBLIC_APP_URL is not set')
  })

  it('lets a complete production build through', () => {
    const plugin = requirePublicBuildEnv({ env: COMPLETE })

    expect(() => plugin.configResolved(resolved('build', 'production'))).not.toThrow()
  })

  it('leaves the dev server and non-production builds alone', () => {
    const plugin = requirePublicBuildEnv({ env: {} })

    expect(() => plugin.configResolved(resolved('serve', 'development'))).not.toThrow()
    expect(() => plugin.configResolved(resolved('build', 'development'))).not.toThrow()
  })
})
