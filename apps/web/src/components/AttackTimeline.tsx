import styles from './AttackTimeline.module.css'

const MITRE_COLORS: Record<string, string> = {
  'Initial Access':    '#7c3aed',
  'Execution':         '#b45309',
  'Persistence':       '#0369a1',
  'Privilege Escalation': '#dc2626',
  'Defense Evasion':   '#065f46',
  'Credential Access': '#92400e',
  'Discovery':         '#1e40af',
  'Lateral Movement':  '#6d28d9',
  'Collection':        '#0f766e',
  'Exfiltration':      '#be123c',
  'Impact':            '#991b1b',
}

function colorFor(step: string) {
  for (const [key, val] of Object.entries(MITRE_COLORS)) {
    if (step.toLowerCase().includes(key.toLowerCase())) return val
  }
  return '#334155'
}

export function AttackTimeline({ chain }: { chain: string[] }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Attack Chain</h2>
      <div className={styles.timeline}>
        {chain.map((step, i) => (
          <div key={i} className={styles.item}>
            <div className={styles.connector}>
              <div className={styles.dot} style={{ background: colorFor(step) }} />
              {i < chain.length - 1 && <div className={styles.line} />}
            </div>
            <div className={styles.card} style={{ borderLeftColor: colorFor(step) }}>
              <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.text}>{step}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
