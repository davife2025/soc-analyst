import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

export async function POST(req: Request) {
  const db = createServiceClient()
  const { name, created_by } = await req.json() as { name: string; created_by: string }

  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  // Generate a cryptographically secure token
  const rawToken = `soc_${randomBytes(32).toString('hex')}`
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')

  const { data: record, error } = await db
    .from('webhook_tokens')
    .insert({ name: name.trim(), token_hash: tokenHash, created_by, active: true })
    .select('id, name, active, created_at, last_used_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log creation
  await db.from('audit_log').insert({
    entity_type: 'token',
    entity_id: record.id,
    action: 'created',
    actor: created_by,
    before: null,
    after: { name, id: record.id },
    metadata: {},
  })

  // Return raw token ONCE — never stored in DB
  return NextResponse.json({ token: rawToken, record })
}
