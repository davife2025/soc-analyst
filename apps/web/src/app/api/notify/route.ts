import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'
import { notifyAllChannels } from '@soc/ai'

export async function POST(req: Request) {
  const db = createServiceClient()
  const { alert_id, investigation_id } = await req.json() as { alert_id: string; investigation_id?: string }

  const { data: alert } = await db.from('alerts').select('*').eq('id', alert_id).single()
  if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })

  const { data: investigation } = investigation_id
    ? await db.from('investigations').select('*').eq('id', investigation_id).single()
    : { data: null }

  const { sent, failed } = await notifyAllChannels({ alert, investigation }, db)
  return NextResponse.json({ sent, failed })
}
