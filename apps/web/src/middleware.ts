import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, RATE_LIMITS } from './lib/rate-limit'
import { withSecurityHeaders, rateLimitResponse } from './lib/security-headers'

const PUBLIC_PATHS = ['/login', '/auth/callback']
const WEBHOOK_PATHS = ['/api/webhooks']
const API_PATHS = ['/api/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'

  // ── Rate limiting by route type ────────────────────────────────
  if (WEBHOOK_PATHS.some(p => pathname.startsWith(p))) {
    const result = rateLimit(ip, RATE_LIMITS.webhook)
    if (!result.allowed) return rateLimitResponse(result.resetAt)
  } else if (pathname.startsWith('/api/seed')) {
    const result = rateLimit(ip, RATE_LIMITS.seed)
    if (!result.allowed) return rateLimitResponse(result.resetAt)
  } else if (pathname.startsWith('/api/actions')) {
    const result = rateLimit(ip, RATE_LIMITS.actions)
    if (!result.allowed) return rateLimitResponse(result.resetAt)
  } else if (API_PATHS.some(p => pathname.startsWith(p))) {
    const result = rateLimit(ip, RATE_LIMITS.api)
    if (!result.allowed) return rateLimitResponse(result.resetAt)
  }

  // ── Webhook routes: token auth only, no session needed ─────────
  if (WEBHOOK_PATHS.some(p => pathname.startsWith(p))) {
    return withSecurityHeaders(NextResponse.next())
  }

  // ── Public routes: pass through ─────────────────────────────────
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return withSecurityHeaders(NextResponse.next())
  }

  // ── Protected routes: session check ────────────────────────────
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // API routes return 401, page routes redirect
    if (pathname.startsWith('/api/')) {
      return withSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return withSecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
