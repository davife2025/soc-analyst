import { createServiceClient } from '@soc/db'
import { normalizeEvent } from '@soc/splunk'
import { NextResponse } from 'next/server'
import type { SplunkEvent } from '@soc/splunk'
import { createHash } from 'crypto'
import { rateLimit, RATE_LIMITS } from '../../../../lib/rate-limit'

async function verifyToken(token: string): Promise<boolean> {
  const db = createServiceClient()
  const hash = createHash('sha256').update(token).digest('hex')
  const { data } = await db
    .from('webhook_tokens')
    .select('id, active')
    .eq('token_hash', hash)
    .eq('active', true)
    .maybeSingle()
  if (data) {
    db.from('webhook_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  }
  return !!data
}

function sanitizeEvent(event: Record<string, unknown>): Record<string, unknown> {
  // Strip any keys that look like injection attempts
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(event)) {
    const key = k.slice(0, 128)
    if (typeof v === 'string') safe[key] = v.slice(0, 4096)
    else if (typeof v === 'number' || typeof v === 'boolean') safe[key] = v
    else if (v && typeof v === 'object') safe[key] = JSON.parse(JSON.stringify(v))
    else safe[key] = String(v ?? '').slice(0, 512)
  }
  return safe
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(ip, RATE_LIMITS.webhook)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const tokenHeader = req.headers.get('x-splunk-webhook-token') ?? ''
  const token = authHeader.replace('Bearer ', '').trim() || tokenHeader.trim()

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  const staticToken = process.env.WEBHOOK_SECRET
  const isValid = (staticToken && token === staticToken) || await verifyToken(token)
  if (!isValid) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const db = createServiceClient()
  const alertName = req.headers.get('x-splunk-alert-name')?.slice(0, 256) ?? undefined
  const ingested: string[] = []
  const errors: string[] = []

  const events: SplunkEvent[] = []
  if (Array.isArray(body)) events.push(...(body as SplunkEvent[]).slice(0, 100))
  else if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if (Array.isArray(b.results)) events.push(...(b.results as SplunkEvent[]).slice(0, 100))
    else if (b.result) events.push(b.result as SplunkEvent)
    else events.push(sanitizeEvent(b as Record<string, unknown>) as SplunkEvent)
  }

  for (const event of events) {
    try {
      const sanitized = sanitizeEvent(event as Record<string, unknown>)
      const normalized = normalizeEvent(sanitized as SplunkEvent, alertName)
      const { data, error } = await db.from('alerts').upsert(
        { splunk_event_id: normalized.splunkEventId, title: normalized.title,
          severity: normalized.severity, raw_event: normalized.rawEvent,
          source_ip: normalized.sourceIp, dest_ip: normalized.destIp,
          source_host: normalized.sourceHost, tags: normalized.tags, status: 'new' },
        { onConflict: 'splunk_event_id', ignoreDuplicates: true }
      ).select('id').single()
      if (error) errors.push(error.message)
      else if (data) ingested.push(data.id)
    } catch (err) { errors.push(String(err)) }
  }

  return NextResponse.json({ ingested: ingested.length, errors })
}
