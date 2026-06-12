'use client'
import { useState } from 'react'
import styles from './ChannelManager.module.css'

type ChannelType = 'slack' | 'pagerduty' | 'email'

interface Channel {
  id: string
  name: string
  type: ChannelType
  active: boolean
  created_at: string
}

interface Props { initialChannels: Channel[] }

const TYPE_ICONS: Record<ChannelType, string> = { slack: '💬', pagerduty: '🔔', email: '📧' }
const TYPE_LABELS: Record<ChannelType, string> = { slack: 'Slack', pagerduty: 'PagerDuty', email: 'Email' }

const CONFIG_FIELDS: Record<ChannelType, Array<{ key: string; label: string; placeholder: string; type?: string }>> = {
  slack: [{ key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', type: 'password' }],
  pagerduty: [{ key: 'routing_key', label: 'Integration Routing Key', placeholder: 'your-pagerduty-routing-key', type: 'password' }],
  email: [
    { key: 'to', label: 'To Address', placeholder: 'team@company.com' },
    { key: 'from', label: 'From Address (optional)', placeholder: 'alerts@yourdomain.com' },
  ],
}

export function ChannelManager({ initialChannels }: Props) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<ChannelType>('slack')
  const [formName, setFormName] = useState('')
  const [formConfig, setFormConfig] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, 'ok' | 'fail'>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function addChannel() {
    if (!formName.trim()) { setFormError('Name is required'); return }
    setSaving(true); setFormError(null)
    const res = await fetch('/api/notification-channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName.trim(), type: formType, config: formConfig }),
    })
    if (res.ok) {
      const ch = await res.json() as Channel
      setChannels(prev => [...prev, ch])
      setShowForm(false); setFormName(''); setFormConfig({})
    } else {
      const { error } = await res.json() as { error: string }
      setFormError(error)
    }
    setSaving(false)
  }

  async function testChannel(id: string) {
    setTesting(id)
    const res = await fetch(`/api/notification-channels/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' }),
    })
    setTestResult(prev => ({ ...prev, [id]: res.ok ? 'ok' : 'fail' }))
    setTesting(null)
    setTimeout(() => setTestResult(prev => { const n = { ...prev }; delete n[id]; return n }), 4000)
  }

  async function toggleChannel(id: string, active: boolean) {
    setToggling(id)
    const res = await fetch(`/api/notification-channels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (res.ok) setChannels(prev => prev.map(c => c.id === id ? { ...c, active: !active } : c))
    setToggling(null)
  }

  async function deleteChannel(id: string) {
    if (!confirm('Delete this channel?')) return
    await fetch(`/api/notification-channels/${id}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className={styles.wrap}>
      {!showForm ? (
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ Add Channel</button>
      ) : (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>New Notification Channel</h3>

          <div className={styles.typeTabs}>
            {(['slack', 'pagerduty', 'email'] as ChannelType[]).map(t => (
              <button key={t}
                className={formType === t ? styles.typeActive : styles.typeTab}
                onClick={() => { setFormType(t); setFormConfig({}) }}>
                {TYPE_ICONS[t]} {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className={styles.field}>
            <label>Channel Name</label>
            <input value={formName} onChange={e => setFormName(e.target.value)}
              placeholder={`e.g. ${formType === 'slack' ? '#security-alerts' : formType === 'pagerduty' ? 'Production On-call' : 'SOC Team'}`} />
          </div>

          {CONFIG_FIELDS[formType].map(f => (
            <div key={f.key} className={styles.field}>
              <label>{f.label}</label>
              <input
                type={f.type ?? 'text'}
                value={formConfig[f.key] ?? ''}
                onChange={e => setFormConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </div>
          ))}

          {formError && <p className={styles.error}>{formError}</p>}

          <div className={styles.formBtns}>
            <button className={styles.saveBtn} onClick={addChannel} disabled={saving}>
              {saving ? 'Saving…' : 'Add Channel'}
            </button>
            <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setFormError(null) }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {channels.length === 0 && !showForm && (
          <div className={styles.empty}>No channels yet. Add one to receive alerts when threats are detected.</div>
        )}
        {channels.map(ch => (
          <div key={ch.id} className={styles.card} data-active={ch.active}>
            <div className={styles.cardLeft}>
              <span className={styles.typeIcon}>{TYPE_ICONS[ch.type]}</span>
              <div>
                <div className={styles.cardName}>{ch.name}</div>
                <div className={styles.cardMeta}>
                  <span className={styles.typeBadge}>{TYPE_LABELS[ch.type]}</span>
                  <span>{ch.active ? 'Active' : 'Disabled'}</span>
                  <span>Added {new Date(ch.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className={styles.cardActions}>
              {testResult[ch.id] && (
                <span className={testResult[ch.id] === 'ok' ? styles.testOk : styles.testFail}>
                  {testResult[ch.id] === 'ok' ? '✓ Sent' : '✗ Failed'}
                </span>
              )}
              <button className={styles.testBtn} onClick={() => testChannel(ch.id)}
                disabled={testing === ch.id || !ch.active}>
                {testing === ch.id ? '…' : 'Test'}
              </button>
              <button className={styles.toggleBtn} onClick={() => toggleChannel(ch.id, ch.active)}
                disabled={toggling === ch.id}>
                {ch.active ? 'Disable' : 'Enable'}
              </button>
              <button className={styles.deleteBtn} onClick={() => deleteChannel(ch.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
