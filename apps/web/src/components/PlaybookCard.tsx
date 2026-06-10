'use client'
import { useState } from 'react'
import styles from './PlaybookCard.module.css'
import type { Database } from '@soc/db'

type Playbook = Database['public']['Tables']['playbooks']['Row']
type Step = { order: number; action: string; parameters: Record<string, unknown>; requires_approval: boolean }

interface Props { playbook: Playbook; canEdit: boolean }

const ACTION_ICONS: Record<string, string> = {
  block_ip: '🚫', isolate_host: '🔒', reset_credentials: '🔑',
  create_ticket: '📋', notify_team: '📣', collect_forensics: '🔍',
  add_to_watchlist: '👁️',
}

export function PlaybookCard({ playbook, canEdit }: Props) {
  const [active, setActive] = useState(playbook.active)
  const [loading, setLoading] = useState(false)
  const steps = playbook.steps as Step[]
  const conditions = playbook.trigger_conditions as Record<string, unknown>

  async function toggleActive() {
    setLoading(true)
    const res = await fetch(`/api/playbooks/${playbook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (res.ok) setActive(!active)
    setLoading(false)
  }

  return (
    <div className={styles.card} data-active={active}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.indicator} data-active={active} />
          <h3 className={styles.name}>{playbook.name}</h3>
        </div>
        {playbook.auto_execute
          ? <span className={styles.autoBadge}>Auto</span>
          : <span className={styles.manualBadge}>Manual</span>}
      </div>

      <p className={styles.desc}>{playbook.description}</p>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Triggers when</p>
        <div className={styles.conditions}>
          {Object.entries(conditions).map(([k, v]) => (
            <span key={k} className={styles.condition}>
              {k}: <strong>{Array.isArray(v) ? v.join(', ') : String(v)}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>{steps.length} steps</p>
        <div className={styles.steps}>
          {steps.map(step => (
            <div key={step.order} className={styles.step}>
              <span className={styles.stepIcon}>{ACTION_ICONS[step.action] ?? '⚡'}</span>
              <span className={styles.stepName}>{step.action.replace(/_/g, ' ')}</span>
              {step.requires_approval && <span className={styles.approvalTag}>needs approval</span>}
            </div>
          ))}
        </div>
      </div>

      {canEdit && (
        <button
          className={active ? styles.deactivate : styles.activate}
          onClick={toggleActive}
          disabled={loading}
        >
          {loading ? '…' : active ? 'Deactivate' : 'Activate'}
        </button>
      )}
    </div>
  )
}
