// This file is the corrected version of apps/web/src/app/api/alerts/[id]/notes/route.ts
// Drop into: apps/web/src/app/api/alerts/[id]/notes/route.ts
import { createServiceClient } from '@soc/db'
import { createRequestClient } from '@soc/auth'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServiceClient()
  const { data, error } = await db
    .from('alert_notes')
    .select('*')
    .eq('alert_id', id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Validate session using the request-scoped client
  const authClient = await createRequestClient()
  const { data: { user }, error: authErr } = await authClient.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { content: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  // Use service client to write (bypasses RLS, auth already validated above)
  const db = createServiceClient()
  const { data, error } = await db
    .from('alert_notes')
    .insert({
      alert_id:     id,
      author_id:    user.id,
      author_email: user.email!,
      content:      body.content.trim().slice(0, 4000),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
