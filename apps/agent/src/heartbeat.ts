import { createServiceClient } from '@soc/db'

const AGENT_VERSION = process.env.AGENT_VERSION ?? '1.0.0'
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS ?? 30_000)
const MAX_HEARTBEATS = 1000

export async function startHeartbeat(): Promise<void> {
  // Emit immediately, then on interval
  await emitHeartbeat()
  setInterval(emitHeartbeat, HEARTBEAT_INTERVAL_MS)
}

async function emitHeartbeat(): Promise<void> {
  const db = createServiceClient()

  try {
    // Count queued alerts
    const { count: queued } = await db
      .from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'new')

    // Count processed in last hour
    const since1h = new Date(Date.now() - 3600_000).toISOString()
    const { count: processed1h } = await db
      .from('investigations').select('*', { count: 'exact', head: true })
      .gte('created_at', since1h)

    // Last investigation timestamp
    const { data: lastInv } = await db
      .from('investigations').select('created_at')
      .order('created_at', { ascending: false }).limit(1).single()

    // Last error from audit log
    const { data: lastErr } = await db
      .from('audit_log').select('after')
      .eq('entity_type', 'investigation').eq('action', 'error')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    const alertsQueued = queued ?? 0
    const status = alertsQueued > 50 ? 'degraded' : 'healthy'

    await db.from('agent_heartbeats').insert({
      agent_version: AGENT_VERSION,
      status,
      alerts_queued: alertsQueued,
      alerts_processed_1h: processed1h ?? 0,
      last_investigation_at: lastInv?.created_at ?? null,
      last_error: lastErr ? JSON.stringify(lastErr.after).slice(0, 500) : null,
      metadata: { pid: process.pid, uptime: Math.round(process.uptime()) },
    })

    // Trim old heartbeats
    const { data: old } = await db
      .from('agent_heartbeats')
      .select('id')
      .order('created_at', { ascending: false })
      .range(MAX_HEARTBEATS, MAX_HEARTBEATS + 100)
    if (old?.length) {
      await db.from('agent_heartbeats').delete().in('id', old.map(r => r.id))
    }
  } catch (err) {
    console.error('[heartbeat] failed:', err)
  }
}
