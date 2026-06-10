/**
 * Edge-compatible in-memory rate limiter using a sliding window.
 * For production scale, swap the Map for an Upstash Redis store.
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  windowSec: number
  /** Key prefix to namespace limiters */
  prefix: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSec * 1000
  const key = `${config.prefix}:${identifier}`

  const entry = store.get(key)

  // New window or expired window
  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: config.limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs }
  }

  entry.count++
  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.windowStart + windowMs }
}

// Cleanup old entries every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > 300_000) store.delete(key)
    }
  }, 300_000)
}

// Preset configs
export const RATE_LIMITS = {
  webhook:    { limit: 100,  windowSec: 60,   prefix: 'webhook' },
  api:        { limit: 200,  windowSec: 60,   prefix: 'api' },
  auth:       { limit: 10,   windowSec: 60,   prefix: 'auth' },
  seed:       { limit: 5,    windowSec: 3600, prefix: 'seed' },
  actions:    { limit: 50,   windowSec: 60,   prefix: 'actions' },
} satisfies Record<string, RateLimitConfig>
