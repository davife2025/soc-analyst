import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = createServiceClient()

  try {
    const [
      { data: latest },
      { data: recent },
      { count: queueDepth },
      { count: totalAlerts },
      { count: totalInvs },
    ] = await Promise.all([
      db.from('agent_heartbeats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('agent_heartbeats')
        .select('status, created_at, alerts_processed_1h')
        .order('created_at', { ascending: false })
        .limit(60),
      db.from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),
      db.from('alerts')
        .select('*', { count: 'exact', head: true }),
      db.from('investigations')
        .select('*', { count: 'exact', head: true }),
    ])

    const now = Date.now()
    const lastSeen = latest?.created_at ? new Date(latest.created_at).getTime() : null
    const secondsAgo = lastSeen ? Math.round((now - lastSeen) / 1000) : null
    const agentOnline = secondsAgo !== null && secondsAgo < 120

    const uptimePct = recent?.length
      ? Math.round((recent.filter(h => h.status === 'healthy').length / recent.length) * 100)
      : 0

    const avgProcessed1h = recent?.length
      ? Math.round(recent.reduce((s, h) => s + ((h.alerts_processed_1h as number) ?? 0), 0) / recent.length)
      : 0

    return NextResponse.json({
      agent: {
        online: agentOnline,
        status: agentOnline ? (latest?.status ?? 'unknown') : 'offline',
        version: latest?.agent_version ?? null,
        lastSeenSecondsAgo: secondsAgo,
        lastSeenAt: latest?.created_at ?? null,
        uptime_pct_last_60: uptimePct,
        pid: (latest?.metadata as Record<string, unknown>)?.pid ?? null,
        processUptime: (latest?.metadata as Record<string, unknown>)?.uptime ?? null,
      },
      queue: { depth: queueDepth ?? 0, processed_1h: avgProcessed1h },
      totals: { alerts: totalAlerts ?? 0, investigations: totalInvs ?? 0 },
      history: (recent ?? []).slice(0, 20).map(h => ({
        status: h.status,
        processed: h.alerts_processed_1h,
        at: h.created_at,
      })),
    })
  } catch (err) {
    // If agent_heartbeats table doesn't exist yet (migration not run), return offline
    console.error('[health] error:', err)
    return NextResponse.json({
      agent: { online: false, status: 'offline', version: null, lastSeenSecondsAgo: null, lastSeenAt: null, uptime_pct_last_60: 0, pid: null, processUptime: null },
      queue: { depth: 0, processed_1h: 0 },
      totals: { alerts: 0, investigations: 0 },
      history: [],
    })
  }
}
