import { createServiceClient } from '@soc/db'
import { requireAuth } from '@soc/auth'
import styles from './tokens.module.css'
import { TokenManager } from '../../../components/TokenManager'

export const dynamic = 'force-dynamic'

export default async function TokensPage() {
  const user = await requireAuth('admin')
  const db = createServiceClient()

  const { data: tokens } = await db
    .from('webhook_tokens')
    .select('id, name, active, created_at, last_used_at')
    .order('created_at', { ascending: false })

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <a href="/dashboard" className={styles.back}>← Dashboard</a>
          <h1>Webhook Tokens</h1>
          <p className={styles.sub}>Manage authentication tokens for Splunk alert webhooks</p>
        </div>
      </header>

      <div className={styles.infoBox}>
        <p className={styles.infoTitle}>🔗 Splunk webhook URL</p>
        <code className={styles.url}>POST https://your-app.vercel.app/api/webhooks/splunk</code>
        <p className={styles.infoText}>
          Set this as the webhook URL in your Splunk alert action. Pass the token via
          <code>Authorization: Bearer &lt;token&gt;</code> or <code>X-Splunk-Webhook-Token: &lt;token&gt;</code> header.
        </p>
      </div>

      <TokenManager tokens={tokens ?? []} createdBy={user.id} />
    </main>
  )
}
