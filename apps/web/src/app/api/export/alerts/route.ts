import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

function escapeCSV(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const since    = searchParams.get('since')
  const severity = searchParams.get('severity')
  const status   = searchParams.get('status')

  const db = createServiceClient()
  let query = db.from('alerts').select('*').order('created_at', { ascending: false }).limit(5000)
  if (since)    query = query.gte('created_at', since)
  if (severity) query = query.eq('severity', severity)
  if (status)   query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ['id','created_at','title','severity','status','source_ip','dest_ip','source_host','tags','splunk_event_id']
  const rows = [
    headers.join(','),
    ...(data ?? []).map(a => headers.map(h => {
      if (h === 'tags') return escapeCSV((a.tags ?? []).join(';'))
      return escapeCSV(a[h as keyof typeof a])
    }).join(','))
  ]

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="soc-alerts-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
