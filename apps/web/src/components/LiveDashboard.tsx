'use client'
import { useRouter } from 'next/navigation'
import { useRealtimeAlerts, useRealtimeInvestigations } from '../hooks/useRealtimeAlerts'
import { AlertCard, SeverityBadge, StatusPill } from '@soc/ui'
import type { Database } from '@soc/db'
import styles from './LiveDashboard.module.css'

type Alert = Database['public']['Tables']['alerts']['Row']
type Investigation = Database['public']['Tables']['investigations']['Row']

interface Props {
  initialAlerts: Alert[]
  initialInvestigations: Investigation[]
}

export function LiveDashboard({ initialAlerts, initialInvestigations }: Props) {
  const router = useRouter()
  const { alerts } = useRealtimeAlerts()
  const { investigations } = useRealtimeInvestigations()

  const liveAlerts = alerts.length ? alerts : initialAlerts
  const liveInvs = investigations.length ? investigations : initialInvestigations

  const stats = {
    critical: liveAlerts.filter(a => a.severity === 'critical').length,
    new: liveAlerts.filter(a => a.status === 'new').length,
    investigating: liveAlerts.filter(a => a.status === 'investigating').length,
    resolved: liveAlerts.filter(a => a.status === 'resolved').length,
  }

  return (
    <>
      <section className={styles.stats}>
        {[
          { label: 'Critical', value: stats.critical, color: '#ef4444' },
          { label: 'New', value: stats.new, color: '#3b82f6' },
          { label: 'Investigating', value: stats.investigating, color: '#f59e0b' },
          { label: 'Resolved', value: stats.resolved, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statNum} style={{ color: s.color }}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Live Alerts</h2>
          <div className={styles.list}>
            {liveAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                id={alert.id}
                title={alert.title}
                severity={alert.severity as never}
                status={alert.status as never}
                sourceIp={alert.source_ip}
                createdAt={alert.created_at}
                onClick={() => router.push(`/investigations?alertId=${alert.id}`)}
              />
            ))}
            {!liveAlerts.length && <p className={styles.empty}>No alerts — system is quiet</p>}
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Active Investigations</h2>
          <div className={styles.list}>
            {liveInvs.map(inv => (
              <div
                key={inv.id}
                className={styles.invCard}
                onClick={() => router.push(`/investigations/${inv.id}`)}
              >
                <div className={styles.invHeader}>
                  <StatusPill status={inv.status as never} />
                  {inv.confidence_score != null && (
                    <span className={styles.confidence}>
                      {Math.round(Number(inv.confidence_score) * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className={styles.invSummary}>
                  {inv.summary ? inv.summary.slice(0, 120) + '…' : 'Analysis in progress…'}
                </div>
                <div className={styles.invMeta}>
                  {new Date(inv.created_at).toLocaleString()}
                </div>
              </div>
            ))}
            {!liveInvs.length && <p className={styles.empty}>No active investigations</p>}
          </div>
        </div>
      </section>
    </>
  )
}
