import { requireAuth } from '@soc/auth'
import styles from './investigations.module.css'
import { InvestigationsList } from '../../components/InvestigationsList'

export const dynamic = 'force-dynamic'

export default async function InvestigationsPage() {
  await requireAuth()
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <a href="/dashboard" className={styles.back}>← Dashboard</a>
        <h1>Investigations</h1>
        <p className={styles.sub}>Search and filter all agent investigations</p>
      </header>
      <InvestigationsList />
    </main>
  )
}
