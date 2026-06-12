import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServiceClient()
  const { data, error } = await db
    .from('alerts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServiceClient()

  let body: { status?: string; severity?: string; tags?: string[] }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const validStatuses = ['new', 'investigating', 'resolved', 'false_positive']
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Invalid status` }, { status: 400 })
  }

  // Snapshot before state for audit
  const { data: before } = await db.from('alerts').select('status, severity, tags').eq('id', id).single()

  const { data, error } = await db
    .from('alerts')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await db.from('audit_log').insert({
    entity_type: 'alert',
    entity_id: id,
    action: 'updated',
    actor: 'analyst',
    before: before as never,
    after: body as never,
    metadata: {},
  })

  return NextResponse.json(data)
}
