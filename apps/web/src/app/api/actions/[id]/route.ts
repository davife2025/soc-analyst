import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const db = createServiceClient()
  const body = await req.json() as { status: string; approved_by?: string }

  const { data, error } = await db
    .from('actions')
    .update({
      status: body.status as never,
      approved_by: body.approved_by ?? null,
      executed_at: body.status === 'approved' ? new Date().toISOString() : null,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await db.from('audit_log').insert({
    entity_type: 'action',
    entity_id: params.id,
    action: body.status,
    actor: body.approved_by ?? 'system',
    before: null,
    after: data as never,
    metadata: {},
  })

  return NextResponse.json(data)
}
