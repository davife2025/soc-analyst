import { requireAuth } from '@soc/auth'
import styles from './analytics.module.css'
import { AnalyticsDashboard } from '../../components/AnalyticsDashboard'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  await requireAuth('analyst')
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <a href="/dashboard" className={styles.back}>← Dashboard</a>
        <h1>Analytics</h1>
        <p className={styles.sub}>Security metrics, trends, and operational insights</p>
      </header>
      <AnalyticsDashboard />
    </main>
  )
}
