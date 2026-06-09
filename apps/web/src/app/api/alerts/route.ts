import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
