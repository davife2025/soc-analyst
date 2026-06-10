'use client'
import { useState } from 'react'
import styles from './AuditTable.module.css'
import type { Database } from '@soc/db'

type AuditEntry = Database['public']['Tables']['audit_log']['Row']

const ENTITY_COLORS: Record<string, string> = {
  investigation: '#3b82f6',
  alert:         '#f59e0b',
  action:        '#8b5cf6',
  playbook:      '#22c55e',
  token:         '#64748b',
}

const ACTION_ICONS: Record<string, string> = {
  complete:     '✓',
  executed:     '⚡',
  approved:     '✓',
  rejected:     '✕',
  created:      '+',
  revoked:      '🚫',
  'needs_review': '⚠',
}

export function AuditTable({ logs }: { logs: AuditEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!logs.length) {
    return <div className={styles.empty}>No audit entries yet</div>
  }

  return (
    <div className={styles.table}>
      <div className={styles.thead}>
        <div className={styles.col} style={{ width: 160 }}>Timestamp</div>
        <div className={styles.col} style={{ width: 110 }}>Entity</div>
        <div className={styles.col} style={{ width: 100 }}>Action</div>
        <div className={styles.col} style={{ flex: 1 }}>Entity ID</div>
        <div className={styles.col} style={{ width: 160 }}>Actor</div>
        <div className={styles.col} style={{ width: 60 }}>Details</div>
      </div>

      {logs.map(log => (
        <div key={log.id}>
          <div
            className={styles.row}
            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
          >
            <div className={styles.cell} style={{ width: 160 }}>
              <span className={styles.time}>{new Date(log.created_at).toLocaleString()}</span>
            </div>
            <div className={styles.cell} style={{ width: 110 }}>
              <span
                className={styles.entityBadge}
                style={{ borderColor: ENTITY_COLORS[log.entity_type] ?? '#334155', color: ENTITY_COLORS[log.entity_type] ?? '#64748b' }}
              >
                {log.entity_type}
              </span>
            </div>
            <div className={styles.cell} style={{ width: 100 }}>
              <span className={styles.action}>
                <span className={styles.actionIcon}>{ACTION_ICONS[log.action] ?? '·'}</span>
                {log.action}
              </span>
            </div>
            <div className={styles.cell} style={{ flex: 1 }}>
              <code className={styles.entityId}>{log.entity_id.slice(0, 8)}…</code>
            </div>
            <div className={styles.cell} style={{ width: 160 }}>
              <span className={styles.actor}>{log.actor}</span>
            </div>
            <div className={styles.cell} style={{ width: 60 }}>
              <span className={styles.chevron}>{expanded === log.id ? '▲' : '▼'}</span>
            </div>
          </div>

          {expanded === log.id && (
            <div className={styles.detail}>
              <div className={styles.detailGrid}>
                <div className={styles.detailBlock}>
                  <p className={styles.detailLabel}>Full Entity ID</p>
                  <code className={styles.detailCode}>{log.entity_id}</code>
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className={styles.detailBlock}>
                    <p className={styles.detailLabel}>Metadata</p>
                    <pre className={styles.json}>{JSON.stringify(log.metadata, null, 2)}</pre>
                  </div>
                )}
                {log.after && (
                  <div className={styles.detailBlock}>
                    <p className={styles.detailLabel}>Result</p>
                    <pre className={styles.json}>{JSON.stringify(log.after, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
