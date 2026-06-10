'use client'
import { useState } from 'react'
import styles from './SeedPanel.module.css'

export function SeedPanel() {
  const [loading, setLoading] = useState<'seed' | 'clear' | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function seed() {
    setLoading('seed')
    setResult(null)
    const res = await fetch('/api/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const data = await res.json() as { message: string; seeded?: { alerts: number; investigations: number; actions: number } }
    setResult(data.seeded
      ? `✓ Seeded: ${data.seeded.alerts} alerts, ${data.seeded.investigations} investigations, ${data.seeded.actions} actions`
      : data.message)
    setLoading(null)
  }

  async function clear() {
    setLoading('clear')
    setResult(null)
    const res = await fetch('/api/seed', { method: 'DELETE' })
    const data = await res.json() as { message: string }
    setResult(`✓ ${data.message}`)
    setLoading(null)
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Demo Data</h3>
      <p className={styles.desc}>
        Seed 8 realistic security alerts (brute force, ransomware, lateral movement, C2 beaconing, data exfiltration and more)
        with one fully investigated ransomware incident including reasoning chain, attack timeline, and pending actions.
      </p>
      <div className={styles.buttons}>
        <button className={styles.seedBtn} onClick={seed} disabled={!!loading}>
          {loading === 'seed' ? 'Seeding…' : '🌱 Seed Demo Data'}
        </button>
        <button className={styles.clearBtn} onClick={clear} disabled={!!loading}>
          {loading === 'clear' ? 'Clearing…' : 'Clear Demo Data'}
        </button>
      </div>
      {result && <p className={styles.result}>{result}</p>}
    </div>
  )
}
