import { requireAuth } from '@soc/auth'
import { createServiceClient } from '@soc/db'
import styles from './notifications.module.css'
import { ChannelManager } from '../../../components/ChannelManager'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  await requireAuth('admin')
  const db = createServiceClient()
  const { data: channels } = await db
    .from('notification_channels')
    .select('id, name, type, active, created_at')
    .order('created_at', { ascending: true })

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <a href="/settings" className={styles.back}>← Settings</a>
        <h1>Notification Channels</h1>
        <p className={styles.sub}>Connect Slack, PagerDuty, or email to receive alerts when threats are detected</p>
      </header>
      <ChannelManager initialChannels={channels ?? []} />
    </main>
  )
}
