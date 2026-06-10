import { requireAuth } from '@soc/auth'
import styles from './settings.module.css'
import { SeedPanel } from '../../components/SeedPanel'

export default async function SettingsPage() {
  const user = await requireAuth('analyst')

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <a href="/dashboard" className={styles.back}>← Dashboard</a>
        <h1>Settings</h1>
      </header>

      <div className={styles.grid}>
        <section className={styles.section}>
          <h2>Developer Tools</h2>
          <SeedPanel />
        </section>

        <section className={styles.section}>
          <h2>Quick Links</h2>
          <div className={styles.links}>
            <a href="/audit" className={styles.link}>
              <span>📋</span>
              <div>
                <p className={styles.linkTitle}>Audit Log</p>
                <p className={styles.linkSub}>Tamper-proof decision trail</p>
              </div>
            </a>
            {user.role === 'admin' && (
              <a href="/settings/tokens" className={styles.link}>
                <span>🔑</span>
                <div>
                  <p className={styles.linkTitle}>Webhook Tokens</p>
                  <p className={styles.linkSub}>Manage Splunk integration tokens</p>
                </div>
              </a>
            )}
            <a href="/playbooks" className={styles.link}>
              <span>⚡</span>
              <div>
                <p className={styles.linkTitle}>Playbooks</p>
                <p className={styles.linkSub}>Automated response rules</p>
              </div>
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
