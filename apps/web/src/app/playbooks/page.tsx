import { createServiceClient } from '@soc/db'
import { requireAuth } from '@soc/auth'
import styles from './playbooks.module.css'
import { PlaybookCard } from '../../components/PlaybookCard'

export const dynamic = 'force-dynamic'

const DEFAULT_PLAYBOOKS = [
  {
    name: 'Critical Alert Auto-Notify',
    description: 'Immediately notify the security team on any critical severity alert',
    trigger_conditions: { severity: 'critical' },
    auto_execute: true,
    active: true,
    steps: [
      { order: 1, action: 'notify_team', parameters: { message: '🚨 Critical security alert detected — investigation underway' }, requires_approval: false },
      { order: 2, action: 'create_ticket', parameters: { title: 'Critical Security Incident', priority: 'P1' }, requires_approval: false },
    ],
  },
  {
    name: 'High Confidence Threat Response',
    description: 'For high-confidence (≥80%) threats: notify team and add IPs to watchlist',
    trigger_conditions: { min_confidence: 0.8, severity: ['critical', 'high'] },
    auto_execute: true,
    active: true,
    steps: [
      { order: 1, action: 'add_to_watchlist', parameters: { indicator: '{{source_ip}}', type: 'ip' }, requires_approval: false },
      { order: 2, action: 'notify_team', parameters: { message: 'High-confidence threat detected. IP added to watchlist.' }, requires_approval: false },
      { order: 3, action: 'block_ip', parameters: { ip: '{{source_ip}}' }, requires_approval: true },
    ],
  },
  {
    name: 'Lateral Movement Containment',
    description: 'Isolate affected hosts when lateral movement is detected in the attack chain',
    trigger_conditions: { attack_chain_contains: ['Lateral Movement'] },
    auto_execute: false,
    active: true,
    steps: [
      { order: 1, action: 'notify_team', parameters: { message: 'Lateral movement detected — host isolation pending approval' }, requires_approval: false },
      { order: 2, action: 'isolate_host', parameters: { hostname: '{{source_host}}' }, requires_approval: true },
      { order: 3, action: 'collect_forensics', parameters: { hostname: '{{source_host}}' }, requires_approval: true },
    ],
  },
]

export default async function PlaybooksPage() {
  const user = await requireAuth('analyst')
  const db = createServiceClient()

  let { data: playbooks } = await db.from('playbooks').select('*').order('created_at', { ascending: true })

  // Seed defaults if empty
  if (!playbooks?.length) {
    const { data: seeded } = await db.from('playbooks').insert(DEFAULT_PLAYBOOKS).select()
    playbooks = seeded
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <a href="/dashboard" className={styles.back}>← Dashboard</a>
          <h1>Playbooks</h1>
          <p className={styles.sub}>Automated response rules triggered by the agent after each investigation</p>
        </div>
      </header>

      <div className={styles.grid}>
        {playbooks?.map(pb => (
          <PlaybookCard key={pb.id} playbook={pb} canEdit={user.role === 'admin' || user.role === 'analyst'} />
        ))}
      </div>
    </main>
  )
}
