import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServiceClient()

  let body: { status?: string; approved_by?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const validStatuses = ['approved', 'rejected', 'executed']
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await db
    .from('actions')
    .update({
      status: body.status as never,
      approved_by: body.approved_by ?? null,
      executed_at: body.status === 'approved' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_log').insert({
    entity_type: 'action',
    entity_id: id,
    action: body.status,
    actor: body.approved_by ?? 'system',
    before: null,
    after: data as never,
    metadata: {},
  })

  return NextResponse.json(data)
}
