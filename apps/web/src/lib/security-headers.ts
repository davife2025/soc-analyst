import { NextResponse } from 'next/server'

export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} wss://*.supabase.co`,
      "img-src 'self' data:",
      "font-src 'self'",
    ].join('; ')
  )
  return response
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const res = NextResponse.json(
    { error: 'Too many requests', retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
    { status: 429 }
  )
  res.headers.set('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)))
  return res
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}
