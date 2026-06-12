'use client'
import { useState } from 'react'
import styles from './AlertRawEvent.module.css'

interface Props { rawEvent: Record<string, unknown> }

const HIGHLIGHT_KEYS = ['_time','src_ip','dest_ip','host','user','process','command','severity','event_type','bytes_out','technique']

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

export function AlertRawEvent({ rawEvent }: Props) {
  const [view, setView]         = useState<'table' | 'json'>('table')
  const [copied, setCopied]     = useState(false)
  const [expanded, setExpanded] = useState(false)

  const allEntries = Object.entries(rawEvent)
  const highlighted = allEntries.filter(([k]) => HIGHLIGHT_KEYS.includes(k))
  const rest        = allEntries.filter(([k]) => !HIGHLIGHT_KEYS.includes(k))
  const shown       = expanded ? allEntries : [...highlighted, ...rest.slice(0, 6)]
  const hiddenCount = allEntries.length - shown.length

  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(rawEvent, null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button className={view === 'table' ? styles.tabActive : styles.tab} onClick={() => setView('table')}>Table</button>
          <button className={view === 'json'  ? styles.tabActive : styles.tab} onClick={() => setView('json')}>JSON</button>
        </div>
        <button className={styles.copyBtn} onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
      </div>

      {view === 'table' ? (
        <div className={styles.table}>
          {shown.map(([key, val]) => {
            const isHighlighted = HIGHLIGHT_KEYS.includes(key)
            const strVal = formatValue(val)
            return (
              <div key={key} className={styles.row} data-highlighted={isHighlighted}>
                <span className={styles.key}>{key}</span>
                <span className={styles.val} title={strVal}>
                  {strVal.length > 100 ? strVal.slice(0, 100) + '…' : strVal}
                </span>
              </div>
            )
          })}
          {hiddenCount > 0 && !expanded && (
            <button className={styles.showMore} onClick={() => setExpanded(true)}>
              + {hiddenCount} more fields
            </button>
          )}
          {expanded && rest.length > 0 && (
            <button className={styles.showMore} onClick={() => setExpanded(false)}>
              Show less
            </button>
          )}
        </div>
      ) : (
        <pre className={styles.json}>{JSON.stringify(rawEvent, null, 2)}</pre>
      )}
    </div>
  )
}
