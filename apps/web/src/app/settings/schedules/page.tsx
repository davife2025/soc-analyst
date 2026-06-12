import { requireAuth } from '@soc/auth'
import { createServiceClient } from '@soc/db'
import styles from './schedules.module.css'
import { ScheduleManager } from '../../../components/ScheduleManager'

export const dynamic = 'force-dynamic'

export default async function SchedulesPage() {
  await requireAuth('analyst')
  const db = createServiceClient()
  const { data: schedules } = await db
    .from('splunk_schedules')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <a href="/settings" className={styles.back}>← Settings</a>
        <h1>Splunk Schedules</h1>
        <p className={styles.sub}>Automatically pull alerts from Splunk saved searches on a schedule</p>
      </header>
      <ScheduleManager initialSchedules={schedules ?? []} />
    </main>
  )
}
