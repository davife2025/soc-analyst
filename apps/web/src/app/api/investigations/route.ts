import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const db = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const severity   = searchParams.get('severity')
  const q          = searchParams.get('q')?.trim()
  const page       = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit      = 20
  const offset     = (page - 1) * limit

  let query = db
    .from('investigations')
    .select('*, alerts!inner(id, title, severity, status, source_ip, created_at)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)   query = query.eq('status', status)
  if (severity) query = query.eq('alerts.severity', severity)
  if (q)        query = query.ilike('alerts.title', `%${q}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count ?? 0, page, limit })
}
