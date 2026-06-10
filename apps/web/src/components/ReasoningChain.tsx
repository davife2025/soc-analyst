'use client'
import { useState } from 'react'
import styles from './ReasoningChain.module.css'
import type { ReasoningStep } from '@soc/db'

interface Props { steps: ReasoningStep[] }

export function ReasoningChain({ steps }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)

  if (!steps?.length) return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Reasoning Chain</h2>
      <p className={styles.empty}>Agent is still reasoning…</p>
    </div>
  )

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Reasoning Chain <span className={styles.count}>{steps.length} steps</span></h2>
      <div className={styles.chain}>
        {steps.map((step, i) => (
          <div key={i} className={styles.step}>
            <div className={styles.stepLeft}>
              <div className={styles.dot} data-tool={!!step.tool_used} />
              {i < steps.length - 1 && <div className={styles.line} />}
            </div>
            <div className={styles.stepRight}>
              <div
                className={styles.stepHeader}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span className={styles.stepNum}>Step {step.step}</span>
                {step.tool_used && (
                  <span className={styles.toolBadge}>{step.tool_used}</span>
                )}
                <span className={styles.stepTime}>
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
                <span className={styles.chevron}>{expanded === i ? '▲' : '▼'}</span>
              </div>
              <p className={styles.thought}>{step.thought.slice(0, 140)}{step.thought.length > 140 ? '…' : ''}</p>
              {expanded === i && (
                <div className={styles.expanded}>
                  <p className={styles.fullThought}>{step.thought}</p>
                  {step.tool_result != null && (
                    <pre className={styles.toolResult}>
                      {JSON.stringify(step.tool_result, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
