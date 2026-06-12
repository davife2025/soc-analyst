'use client'
import { useState } from 'react'
import styles from './ScheduleManager.module.css'

interface Schedule {
  id: string; name: string; description: string | null
  search_query: string; timerange: string; cron_expression: string
  active: boolean; last_run_at: string | null
  last_run_status: 'success' | 'error' | 'running' | null
  last_error: string | null; alerts_created_last_run: number; created_at: string
}

const CRON_PRESETS = [
  { label: 'Every 5 min',  value: '*/5 * * * *' },
  { label: 'Every 15 min', value: '*/15 * * * *' },
  { label: 'Every 30 min', value: '*/30 * * * *' },
  { label: 'Every hour',   value: '0 * * * *' },
  { label: 'Custom',       value: 'custom' },
]

const TIMERANGE_PRESETS = ['-5m', '-15m', '-30m', '-1h', '-6h', '-24h']

export function ScheduleManager({ initialSchedules }: { initialSchedules: Schedule[] }) {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', search_query: '', timerange: '-15m', cron_expression: '*/15 * * * *', cronPreset: '*/15 * * * *' })
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  function setF(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })) }

  async function addSchedule() {
    if (!form.name.trim() || !form.search_query.trim()) { setFormError('Name and search query required'); return }
    setSaving(true); setFormError(null)
    const res = await fetch('/api/splunk/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || null, search_query: form.search_query.trim(), timerange: form.timerange, cron_expression: form.cron_expression }),
    })
    if (res.ok) {
      const s = await res.json() as Schedule
      setSchedules(prev => [...prev, s])
      setShowForm(false)
      setForm({ name: '', description: '', search_query: '', timerange: '-15m', cron_expression: '*/15 * * * *', cronPreset: '*/15 * * * *' })
    } else {
      const { error } = await res.json() as { error: string }
      setFormError(error)
    }
    setSaving(false)
  }

  async function toggleSchedule(id: string, active: boolean) {
    setToggling(id)
    const res = await fetch(`/api/splunk/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (res.ok) setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: !active } : s))
    setToggling(null)
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Delete this schedule?')) return
    await fetch(`/api/splunk/schedule/${id}`, { method: 'DELETE' })
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  const statusColor = { success: '#22c55e', error: '#ef4444', running: '#f59e0b' }

  return (
    <div className={styles.wrap}>
      {!showForm ? (
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ New Schedule</button>
      ) : (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>New Splunk Schedule</h3>
          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label>Name *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Failed Logins" />
            </div>
            <div className={styles.field}>
              <label>Description</label>
              <input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className={styles.field}>
            <label>SPL Search Query *</label>
            <textarea className={styles.textarea} value={form.search_query}
              onChange={e => setF('search_query', e.target.value)}
              placeholder={`index=main sourcetype=syslog (failed OR error) | head 100`} rows={3} />
          </div>
          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label>Time Range</label>
              <div className={styles.presets}>
                {TIMERANGE_PRESETS.map(t => (
                  <button key={t} type="button"
                    className={form.timerange === t ? styles.presetActive : styles.preset}
                    onClick={() => setF('timerange', t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>Schedule</label>
              <div className={styles.presets}>
                {CRON_PRESETS.map(p => (
                  <button key={p.value} type="button"
                    className={form.cronPreset === p.value ? styles.presetActive : styles.preset}
                    onClick={() => { setF('cronPreset', p.value); if (p.value !== 'custom') setF('cron_expression', p.value) }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {form.cronPreset === 'custom' && (
                <input className={styles.cronInput} value={form.cron_expression}
                  onChange={e => setF('cron_expression', e.target.value)} placeholder="*/15 * * * *" />
              )}
            </div>
          </div>
          {formError && <p className={styles.error}>{formError}</p>}
          <div className={styles.formBtns}>
            <button className={styles.saveBtn} onClick={addSchedule} disabled={saving}>{saving ? 'Saving…' : 'Create Schedule'}</button>
            <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setFormError(null) }}>Cancel</button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {schedules.length === 0 && !showForm && (
          <div className={styles.empty}>No schedules yet. Create one to automatically pull alerts from Splunk.</div>
        )}
        {schedules.map(s => (
          <div key={s.id} className={styles.card} data-active={s.active}>
            <div className={styles.cardHeader}>
              <div className={styles.cardLeft}>
                <span className={styles.indicator} data-active={s.active} />
                <div>
                  <span className={styles.cardName}>{s.name}</span>
                  {s.description && <span className={styles.cardDesc}>{s.description}</span>}
                </div>
              </div>
              <div className={styles.cardRight}>
                <span className={styles.cronBadge}>{s.cron_expression}</span>
                <span className={styles.timerangeBadge}>{s.timerange}</span>
              </div>
            </div>
            <div className={styles.cardQuery}>
              <code>{s.search_query.slice(0, 120)}{s.search_query.length > 120 ? '…' : ''}</code>
            </div>
            <div className={styles.cardFooter}>
              <div className={styles.lastRun}>
                {s.last_run_status && (
                  <span style={{ color: statusColor[s.last_run_status] }}>
                    ● {s.last_run_status}
                  </span>
                )}
                {s.last_run_at && <span className={styles.lastRunTime}>Last run: {new Date(s.last_run_at).toLocaleString()}</span>}
                {s.last_run_status === 'success' && <span className={styles.alertsCreated}>{s.alerts_created_last_run} alerts</span>}
                {s.last_error && <span className={styles.lastError} title={s.last_error}>Error: {s.last_error.slice(0, 60)}</span>}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.toggleBtn} onClick={() => toggleSchedule(s.id, s.active)} disabled={toggling === s.id}>
                  {s.active ? 'Pause' : 'Resume'}
                </button>
                <button className={styles.deleteBtn} onClick={() => deleteSchedule(s.id)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
