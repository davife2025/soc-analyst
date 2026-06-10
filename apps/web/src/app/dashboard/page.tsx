import { createServiceClient } from '@soc/db'
import { requireAuth } from '@soc/auth'
import styles from './dashboard.module.css'
import { LiveDashboard } from '../../components/LiveDashboard'
import { UserMenu } from '../../components/UserMenu'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireAuth()
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
        <nav className={styles.nav}>
          <a href="/dashboard"       className={styles.navLink}>Dashboard</a>
          <a href="/playbooks"       className={styles.navLink}>Playbooks</a>
          <a href="/audit"           className={styles.navLink}>Audit</a>
          <a href="/settings"        className={styles.navLink}>Settings</a>
          {user.role === 'admin' && (
            <a href="/settings/tokens" className={styles.navLink}>Tokens</a>
          )}
        </nav>
        <UserMenu user={user} />
      </header>
      <LiveDashboard initialAlerts={alerts ?? []} initialInvestigations={investigations ?? []} />
    </main>
  )
}
