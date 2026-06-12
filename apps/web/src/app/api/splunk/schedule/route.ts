import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db
    .from('splunk_schedules')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const db = createServiceClient()
  const body = await req.json() as {
    name: string; description?: string; search_query: string
    timerange?: string; cron_expression?: string
  }
  if (!body.name || !body.search_query) {
    return NextResponse.json({ error: 'name and search_query required' }, { status: 400 })
  }
  const { data, error } = await db.from('splunk_schedules').insert({
    name: body.name,
    description: body.description ?? null,
    search_query: body.search_query,
    timerange: body.timerange ?? '-15m',
    cron_expression: body.cron_expression ?? '*/15 * * * *',
    active: true,
    alerts_created_last_run: 0,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
