import { createServiceClient } from '@soc/db'
import styles from './dashboard.module.css'
import { LiveDashboard } from '../../components/LiveDashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const db = createServiceClient()

  const [{ data: alerts }, { data: investigations }] = await Promise.all([
    db.from('alerts').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('investigations').select('*').order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>SOC Analyst</h1>
          <span className={styles.badge}>● Live · Kimi K2</span>
        </div>
      </header>
      <LiveDashboard initialAlerts={alerts ?? []} initialInvestigations={investigations ?? []} />
    </main>
  )
}
