'use client'
import { useState } from 'react'
import styles from './AlertStatusEditor.module.css'

type AlertStatus   = 'new' | 'investigating' | 'resolved' | 'false_positive'
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

const STATUSES: { value: AlertStatus; label: string; color: string }[] = [
  { value: 'new',           label: 'New',            color: '#3b82f6' },
  { value: 'investigating', label: 'Investigating',  color: '#f59e0b' },
  { value: 'resolved',      label: 'Resolved',       color: '#22c55e' },
  { value: 'false_positive',label: 'False Positive', color: '#6b7280' },
]

const SEVERITIES: { value: AlertSeverity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high',     label: 'High',     color: '#f97316' },
  { value: 'medium',   label: 'Medium',   color: '#eab308' },
  { value: 'low',      label: 'Low',      color: '#3b82f6' },
  { value: 'info',     label: 'Info',     color: '#6b7280' },
]

interface Props {
  alertId: string
  currentStatus: AlertStatus
  currentSeverity: AlertSeverity
  canEdit: boolean
}

export function AlertStatusEditor({ alertId, currentStatus, currentSeverity, canEdit }: Props) {
  const [status, setStatus]     = useState<AlertStatus>(currentStatus)
  const [severity, setSeverity] = useState<AlertSeverity>(currentSeverity)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const dirty = status !== currentStatus || severity !== currentSeverity

  async function save() {
    setSaving(true); setError(null)
    const res = await fetch(`/api/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, severity }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      const { error: e } = await res.json() as { error: string }
      setError(e)
    }
    setSaving(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <div className={styles.group}>
          <span className={styles.label}>Status</span>
          <div className={styles.options}>
            {STATUSES.map(s => (
              <button
                key={s.value}
                className={status === s.value ? styles.optionActive : styles.option}
                style={status === s.value ? { borderColor: s.color, color: s.color } : {}}
                onClick={() => canEdit && setStatus(s.value)}
                disabled={!canEdit}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.group}>
          <span className={styles.label}>Severity</span>
          <div className={styles.options}>
            {SEVERITIES.map(s => (
              <button
                key={s.value}
                className={severity === s.value ? styles.optionActive : styles.option}
                style={severity === s.value ? { borderColor: s.color, color: s.color, background: s.color + '18' } : {}}
                onClick={() => canEdit && setSeverity(s.value)}
                disabled={!canEdit}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {canEdit && dirty && (
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      )}
      {saved && <span className={styles.savedMsg}>✓ Saved</span>}
      {!canEdit && <p className={styles.readOnly}>Viewer — read only</p>}
    </div>
  )
}
