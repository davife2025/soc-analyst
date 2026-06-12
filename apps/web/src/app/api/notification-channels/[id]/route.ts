import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'
import { notifyAllChannels } from '@soc/ai'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServiceClient()
  const body = await req.json() as { active?: boolean; name?: string }
  const { data, error } = await db
    .from('notification_channels')
    .update(body)
    .eq('id', id)
    .select('id, name, type, active, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServiceClient()
  const { error } = await db.from('notification_channels').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}

// POST to /api/notification-channels/[id] with action=test sends a test notification
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServiceClient()
  const { action } = await req.json() as { action: string }
  if (action !== 'test') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const { data: channel } = await db
    .from('notification_channels').select('*').eq('id', id).single()
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  // Send a test notification using a fake alert
  const testAlert = {
    id: 'test-' + Date.now(),
    created_at: new Date().toISOString(),
    splunk_event_id: 'test',
    severity: 'high' as const,
    status: 'new' as const,
    title: '🧪 Test Notification from SOC Analyst',
    raw_event: {},
    source_ip: '192.168.1.1',
    dest_ip: null,
    source_host: 'test-host',
    tags: ['test'],
  }

  try {
    const { sendNotification } = await import('@soc/ai')
    await sendNotification(channel as never, { alert: testAlert }, db)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
