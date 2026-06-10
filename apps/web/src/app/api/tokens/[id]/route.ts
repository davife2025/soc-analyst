import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const db = createServiceClient()

  const { data, error } = await db
    .from('webhook_tokens')
    .update({ active: false })
    .eq('id', params.id)
    .select('id, name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_log').insert({
    entity_type: 'token',
    entity_id: params.id,
    action: 'revoked',
    actor: 'admin',
    before: null,
    after: { id: data.id, name: data.name },
    metadata: {},
  })

  return NextResponse.json({ revoked: true })
}
