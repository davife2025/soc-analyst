'use client'
import { useEffect, useState, useCallback } from 'react'
import styles from './AgentHealthWidget.module.css'

interface HealthData {
  agent: { online: boolean; status: string; version: string | null; lastSeenSecondsAgo: number | null; lastSeenAt: string | null; uptime_pct_last_60: number; processUptime: number | null }
  queue: { depth: number; processed_1h: number }
  totals: { alerts: number; investigations: number }
  history: Array<{ status: string; processed: number; at: string }>
}

function formatUptime(secs: number | null): string {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatLastSeen(secs: number | null): string {
  if (secs === null) return 'never'
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

export function AgentHealthWidget() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) setData(await res.json() as HealthData)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchHealth()
    const id = setInterval(fetchHealth, 30_000)
    return () => clearInterval(id)
  }, [fetchHealth])

  if (loading) return <div className={styles.widget}><div className={styles.skeleton} /></div>

  const { agent, queue, totals, history } = data ?? {
    agent: { online: false, status: 'offline', version: null, lastSeenSecondsAgo: null, lastSeenAt: null, uptime_pct_last_60: 0, processUptime: null },
    queue: { depth: 0, processed_1h: 0 },
    totals: { alerts: 0, investigations: 0 },
    history: [],
  }

  const statusColor = agent.online
    ? (agent.status === 'healthy' ? '#22c55e' : '#f59e0b')
    : '#ef4444'

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.statusRow}>
          <span className={styles.dot} style={{ background: statusColor, boxShadow: agent.online ? `0 0 6px ${statusColor}88` : 'none' }} />
          <span className={styles.statusLabel} style={{ color: statusColor }}>
            Agent {agent.online ? agent.status : 'offline'}
          </span>
          {agent.version && <span className={styles.version}>v{agent.version}</span>}
        </div>
        <span className={styles.lastSeen}>{formatLastSeen(agent.lastSeenSecondsAgo)}</span>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricVal} style={{ color: queue.depth > 10 ? '#f59e0b' : '#e2e8f0' }}>
            {queue.depth}
          </span>
          <span className={styles.metricLabel}>queued</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricVal}>{queue.processed_1h}</span>
          <span className={styles.metricLabel}>/ hr</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricVal}>{agent.uptime_pct_last_60}%</span>
          <span className={styles.metricLabel}>uptime</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricVal}>{formatUptime(agent.processUptime)}</span>
          <span className={styles.metricLabel}>running</span>
        </div>
      </div>

      {/* Mini heartbeat sparkline */}
      {history.length > 0 && (
        <div className={styles.sparkline}>
          {history.slice().reverse().map((h, i) => (
            <div key={i} className={styles.spark}
              style={{ background: h.status === 'healthy' ? '#22c55e' : h.status === 'degraded' ? '#f59e0b' : '#ef4444' }}
              title={`${h.status} · ${new Date(h.at).toLocaleTimeString()}`}
            />
          ))}
        </div>
      )}

      <div className={styles.totals}>
        <span>{totals.alerts.toLocaleString()} alerts</span>
        <span>·</span>
        <span>{totals.investigations.toLocaleString()} investigations</span>
      </div>
    </div>
  )
}
