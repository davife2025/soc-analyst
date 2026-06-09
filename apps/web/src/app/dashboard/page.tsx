import { createServiceClient } from '@soc/db'
import styles from './dashboard.module.css'
import { AlertCard } from '@soc/ui'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const db = createServiceClient()
  const { data: alerts } = await db
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: investigations } = await db
    .from('investigations')
    .select('*, alerts(title, severity)')
    .order('created_at', { ascending: false })
    .limit(10)

  const counts = {
    critical: alerts?.filter(a => a.severity === 'critical').length ?? 0,
    new: alerts?.filter(a => a.status === 'new').length ?? 0,
    investigating: alerts?.filter(a => a.status === 'investigating').length ?? 0,
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>SOC Analyst</h1>
        <span className={styles.badge}>Autonomous · Kimi K2</span>
      </header>

      <section className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: '#ef4444' }}>{counts.critical}</span>
          <span className={styles.statLabel}>Critical</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: '#3b82f6' }}>{counts.new}</span>
          <span className={styles.statLabel}>New</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: '#f59e0b' }}>{counts.investigating}</span>
          <span className={styles.statLabel}>Investigating</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{investigations?.length ?? 0}</span>
          <span className={styles.statLabel}>Active Investigations</span>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <h2>Recent Alerts</h2>
          <div className={styles.list}>
            {alerts?.map(alert => (
              <AlertCard
                key={alert.id}
                id={alert.id}
                title={alert.title}
                severity={alert.severity as never}
                status={alert.status as never}
                sourceIp={alert.source_ip}
                createdAt={alert.created_at}
              />
            ))}
            {!alerts?.length && <p className={styles.empty}>No alerts yet</p>}
          </div>
        </div>

        <div className={styles.panel}>
          <h2>Active Investigations</h2>
          <div className={styles.list}>
            {investigations?.map(inv => (
              <div key={inv.id} className={styles.invCard}>
                <div className={styles.invTitle}>{(inv as never as { alerts: { title: string } }).alerts?.title}</div>
                <div className={styles.invMeta}>
                  <span>{inv.status}</span>
                  {inv.confidence_score && (
                    <span>confidence: {Math.round(inv.confidence_score * 100)}%</span>
                  )}
                </div>
              </div>
            ))}
            {!investigations?.length && <p className={styles.empty}>No active investigations</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
