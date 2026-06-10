import { createServiceClient } from '@soc/db'
import { normalizeEvent } from '@soc/splunk'
import { NextResponse } from 'next/server'
import type { SplunkEvent } from '@soc/splunk'
import { createHash } from 'crypto'

// Verify webhook token via hash comparison
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
    // Update last_used_at async (don't await to keep response fast)
    db.from('webhook_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  }

  return !!data
}

export async function POST(req: Request) {
  // Auth: Bearer token or X-Splunk-Webhook-Token header
  const authHeader = req.headers.get('authorization') ?? ''
  const tokenHeader = req.headers.get('x-splunk-webhook-token') ?? ''
  const token = authHeader.replace('Bearer ', '') || tokenHeader

  if (!token) {
    return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 })
  }

  // Allow env-based static token (for dev) or DB-stored tokens (for prod)
  const staticToken = process.env.WEBHOOK_SECRET
  const isValid = (staticToken && token === staticToken) || await verifyToken(token)

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const db = createServiceClient()
  const alertName = req.headers.get('x-splunk-alert-name') ?? undefined
  const results: string[] = []
  const errors: string[] = []

  // Splunk can send single event or { result: {...} } or { results: [...] }
  const events: SplunkEvent[] = []

  if (Array.isArray(body)) {
    events.push(...body as SplunkEvent[])
  } else if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>
    if (b.results && Array.isArray(b.results)) {
      events.push(...b.results as SplunkEvent[])
    } else if (b.result) {
      events.push(b.result as SplunkEvent)
    } else {
      events.push(b as unknown as SplunkEvent)
    }
  }

  for (const event of events) {
    try {
      const normalized = normalizeEvent(event, alertName)
      const { data, error } = await db.from('alerts').upsert(
        {
          splunk_event_id: normalized.splunkEventId,
          title: normalized.title,
          severity: normalized.severity,
          raw_event: normalized.rawEvent,
          source_ip: normalized.sourceIp,
          dest_ip: normalized.destIp,
          source_host: normalized.sourceHost,
          tags: normalized.tags,
          status: 'new',
        },
        { onConflict: 'splunk_event_id', ignoreDuplicates: true }
      ).select('id').single()

      if (error) errors.push(error.message)
      else if (data) results.push(data.id)
    } catch (err) {
      errors.push(String(err))
    }
  }

  console.log(`[webhook/splunk] ingested=${results.length} errors=${errors.length}`)
  return NextResponse.json({ ingested: results.length, errors })
}
