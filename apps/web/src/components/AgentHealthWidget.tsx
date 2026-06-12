'use client'
import { useEffect, useState, useCallback } from 'react'
import styles from './AgentHealthWidget.module.css'

interface HealthData {
  agent: {
    online: boolean; status: string; version: string | null
    lastSeenSecondsAgo: number | null; lastSeenAt: string | null
    uptime_pct_last_60: number; processUptime: number | null
  }
  queue:   { depth: number; processed_1h: number }
  totals:  { alerts: number; investigations: number }
  history: Array<{ status: string; processed: number; at: string }>
}

const OFFLINE: HealthData = {
  agent:   { online: false, status: 'offline', version: null, lastSeenSecondsAgo: null, lastSeenAt: null, uptime_pct_last_60: 0, processUptime: null },
  queue:   { depth: 0, processed_1h: 0 },
  totals:  { alerts: 0, investigations: 0 },
  history: [],
}

function fmt(secs: number | null, fallback = '—'): string {
  if (secs === null || secs === undefined) return fallback
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function ago(secs: number | null): string {
  if (secs === null) return 'never'
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

export function AgentHealthWidget() {
  const [data, setData]       = useState<HealthData>(OFFLINE)
  const [loading, setLoading] = useState(true)

  const poll = useCallback(async () => {
    try {
      const res = await window.fetch('/api/health')
      if (res.ok) setData(await res.json() as HealthData)
    } catch { /* silent — agent may not be running */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [poll])

  if (loading) {
    return (
      <div className={styles.widget}>
        <div className={styles.skeleton} />
      </div>
    )
  }

  const { agent, queue, totals, history } = data
  const statusColor = agent.online
    ? (agent.status === 'healthy' ? '#22c55e' : '#f59e0b')
    : '#ef4444'

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.statusRow}>
          <span className={styles.dot}
            style={{ background: statusColor, boxShadow: agent.online ? `0 0 6px ${statusColor}88` : 'none' }} />
          <span className={styles.statusLabel} style={{ color: statusColor }}>
            Agent {agent.online ? agent.status : 'offline'}
          </span>
          {agent.version && <span className={styles.version}>v{agent.version}</span>}
        </div>
        <span className={styles.lastSeen}>{ago(agent.lastSeenSecondsAgo)}</span>
      </div>

      <div className={styles.metrics}>
        <Metric val={queue.depth}           label="queued"   warn={queue.depth > 10} />
        <Metric val={queue.processed_1h}    label="/ hr"     />
        <Metric val={`${agent.uptime_pct_last_60}%`} label="uptime" />
        <Metric val={fmt(agent.processUptime)} label="running" />
      </div>

      {history.length > 0 && (
        <div className={styles.sparkline}>
          {[...history].reverse().map((h, i) => (
            <div key={i} className={styles.spark}
              style={{ background: h.status === 'healthy' ? '#22c55e' : h.status === 'degraded' ? '#f59e0b' : '#ef4444' }}
              title={`${h.status} · ${new Date(h.at).toLocaleTimeString()}`} />
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

function Metric({ val, label, warn = false }: { val: string | number; label: string; warn?: boolean }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricVal} style={warn ? { color: '#f59e0b' } : undefined}>{val}</span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  )
}
