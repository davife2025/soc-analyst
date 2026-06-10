'use client'
import { useState } from 'react'
import styles from './ActionPanel.module.css'
import type { Database } from '@soc/db'

type Action = Database['public']['Tables']['actions']['Row']

interface Props {
  investigationId: string
  actions: Action[]
}

const ACTION_ICONS: Record<string, string> = {
  block_ip:            '🚫',
  isolate_host:        '🔒',
  reset_credentials:   '🔑',
  create_ticket:       '📋',
  notify_team:         '📣',
  collect_forensics:   '🔍',
  add_to_watchlist:    '👁️',
}

export function ActionPanel({ actions: initial }: Props) {
  const [actions, setActions] = useState<Action[]>(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(actionId: string, decision: 'approved' | 'rejected') {
    setLoading(actionId)
    setError(null)

    // Optimistic update
    setActions(prev => prev.map(a =>
      a.id === actionId ? { ...a, status: decision } : a
    ))

    try {
      const res = await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision, approved_by: 'analyst@soc' }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const updated = await res.json() as Action
      setActions(prev => prev.map(a => a.id === actionId ? updated : a))
    } catch (err) {
      setError(String(err))
      // Revert optimistic update
      setActions(prev => prev.map(a =>
        a.id === actionId ? { ...a, status: 'pending' } : a
      ))
    } finally {
      setLoading(null)
    }
  }

  const pending  = actions.filter(a => a.status === 'pending')
  const decided  = actions.filter(a => a.status !== 'pending')

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>
        Recommended Actions
        {pending.length > 0 && <span className={styles.badge}>{pending.length} pending</span>}
      </h2>

      {error && <p className={styles.error}>{error}</p>}

      {!actions.length && (
        <p className={styles.empty}>No actions generated yet</p>
      )}

      {pending.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Awaiting approval</p>
          {pending.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              loading={loading === action.id}
              onApprove={() => handleAction(action.id, 'approved')}
              onReject={() => handleAction(action.id, 'rejected')}
            />
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Completed</p>
          {decided.map(action => (
            <ActionCard key={action.id} action={action} loading={false} />
          ))}
        </div>
      )}
    </div>
  )
}

function ActionCard({ action, loading, onApprove, onReject }: {
  action: Action
  loading: boolean
  onApprove?: () => void
  onReject?: () => void
}) {
  const icon = ACTION_ICONS[action.action_type] ?? '⚡'
  const isPending  = action.status === 'pending'
  const isApproved = action.status === 'approved' || action.status === 'executed'
  const isRejected = action.status === 'rejected'

  return (
    <div className={styles.card} data-status={action.status}>
      <div className={styles.cardHeader}>
        <span className={styles.icon}>{icon}</span>
        <div className={styles.cardInfo}>
          <span className={styles.actionType}>{action.action_type.replace(/_/g, ' ')}</span>
          <p className={styles.description}>{action.description}</p>
        </div>
        <span className={`${styles.statusDot} ${isApproved ? styles.approved : isRejected ? styles.rejected : styles.pendingDot}`} />
      </div>

      {action.parameters && Object.keys(action.parameters as object).length > 0 && (
        <pre className={styles.params}>
          {JSON.stringify(action.parameters, null, 2)}
        </pre>
      )}

      {action.result && <p className={styles.result}>Result: {action.result}</p>}

      {isPending && onApprove && onReject && (
        <div className={styles.buttons}>
          <button className={styles.approve} onClick={onApprove} disabled={loading}>
            {loading ? '…' : '✓ Approve'}
          </button>
          <button className={styles.reject} onClick={onReject} disabled={loading}>
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  )
}
