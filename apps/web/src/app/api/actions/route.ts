import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const db = createServiceClient()
  const { searchParams } = new URL(req.url)
  const investigationId = searchParams.get('investigation_id')
  const status = searchParams.get('status')

  let query = db.from('actions').select('*').order('created_at', { ascending: true })
  if (investigationId) query = query.eq('investigation_id', investigationId)
  if (status) query = query.eq('status', status as never)

  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
