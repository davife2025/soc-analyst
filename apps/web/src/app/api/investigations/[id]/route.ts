import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = createServiceClient()
  const { data, error } = await db
    .from('investigations')
    .select('*, alerts(*), actions(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
