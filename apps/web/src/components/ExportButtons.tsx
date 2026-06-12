'use client'
import { useState } from 'react'
import styles from './ExportButtons.module.css'

interface AlertExportProps { type: 'alerts'; since?: string; severity?: string; status?: string }
interface InvExportProps   { type: 'investigation'; investigationId: string }
type Props = AlertExportProps | InvExportProps

export function ExportButtons(props: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function download(url: string, label: string) {
    setLoading(label)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const contentDisposition = res.headers.get('content-disposition') ?? ''
      const match = contentDisposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? 'export'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      console.error(err)
      alert(String(err))
    } finally {
      setLoading(null)
    }
  }

  if (props.type === 'alerts') {
    const params = new URLSearchParams()
    if (props.since)    params.set('since', props.since)
    if (props.severity) params.set('severity', props.severity)
    if (props.status)   params.set('status', props.status)

    return (
      <div className={styles.wrap}>
        <button
          className={styles.btn}
          disabled={!!loading}
          onClick={() => download(`/api/export/alerts?${params}`, 'csv')}
        >
          {loading === 'csv' ? '…' : '⬇ CSV'}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <button
        className={styles.btn}
        disabled={!!loading}
        onClick={() => download(`/api/export/investigation?id=${props.investigationId}&format=txt`, 'txt')}
      >
        {loading === 'txt' ? '…' : '⬇ Report (.txt)'}
      </button>
      <button
        className={styles.btn}
        disabled={!!loading}
        onClick={() => download(`/api/export/investigation?id=${props.investigationId}&format=json`, 'json')}
      >
        {loading === 'json' ? '…' : '⬇ JSON'}
      </button>
    </div>
  )
}
