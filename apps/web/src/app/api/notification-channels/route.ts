import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db
    .from('notification_channels')
    .select('id, name, type, active, created_at, config')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask secrets in config before returning
  const masked = (data ?? []).map(ch => ({
    ...ch,
    config: maskConfig(ch.type as string, ch.config as Record<string, unknown>),
  }))
  return NextResponse.json(masked)
}

export async function POST(req: Request) {
  const db = createServiceClient()
  const body = await req.json() as {
    name: string; type: string; config: Record<string, unknown>
  }
  if (!body.name || !body.type) {
    return NextResponse.json({ error: 'name and type required' }, { status: 400 })
  }
  const { data, error } = await db
    .from('notification_channels')
    .insert({ name: body.name, type: body.type as never, config: body.config ?? {}, active: true })
    .select('id, name, type, active, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

function maskConfig(type: string, config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config }
  if (type === 'slack' && masked.webhook_url) masked.webhook_url = mask(masked.webhook_url as string)
  if (type === 'pagerduty' && masked.routing_key) masked.routing_key = mask(masked.routing_key as string)
  return masked
}
function mask(s: string): string {
  return s.length <= 8 ? '••••••••' : s.slice(0, 4) + '••••••••' + s.slice(-4)
}
