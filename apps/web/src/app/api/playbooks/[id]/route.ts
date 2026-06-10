import { createServiceClient } from '@soc/db'
import { requireAuth } from '@soc/auth'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireAuth('analyst')
  const db = createServiceClient()
  const body = await req.json() as { active?: boolean }

  const { data, error } = await db
    .from('playbooks')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
