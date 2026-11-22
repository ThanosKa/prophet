import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { error, SESSION_EXPIRED_MESSAGE } from '@/types'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/auth-success',
  '/api/webhooks/clerk(.*)',
  '/api/stripe/webhook',
  '/api/agent/chat/dev',
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  if (req.nextUrl.pathname.startsWith('/api/')) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(error({ message: SESSION_EXPIRED_MESSAGE, code: 'UNAUTHORIZED' }), { status: 401 })
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
