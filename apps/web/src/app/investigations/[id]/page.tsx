import { createServiceClient } from '@soc/db'
import { notFound } from 'next/navigation'
import styles from './investigation.module.css'
import { ReasoningChain } from '../../../components/ReasoningChain'
import { AttackTimeline } from '../../../components/AttackTimeline'
import { ActionPanel } from '../../../components/ActionPanel'
import { SeverityBadge, StatusPill } from '@soc/ui'

export const dynamic = 'force-dynamic'

export default async function InvestigationPage({ params }: { params: { id: string } }) {
  const db = createServiceClient()

  const { data: inv } = await db
    .from('investigations')
    .select('*, alerts(*)')
    .eq('id', params.id)
    .single()

  if (!inv) notFound()

  const { data: actions } = await db
    .from('actions')
    .select('*')
    .eq('investigation_id', params.id)
    .order('created_at', { ascending: true })

  const alert = (inv as never as { alerts: { title: string; severity: string; source_ip: string | null; created_at: string } }).alerts

  return (
    <main className={styles.main}>
      <div className={styles.breadcrumb}>
        <a href="/dashboard">← Dashboard</a>
        <span>/</span>
        <span>Investigation</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          {alert && <SeverityBadge severity={alert.severity as never} />}
          <h1 className={styles.title}>{alert?.title ?? 'Investigation'}</h1>
          <StatusPill status={inv.status as never} />
        </div>
        <div className={styles.meta}>
          {alert?.source_ip && <span>Source IP: <code>{alert.source_ip}</code></span>}
          {inv.confidence_score != null && (
            <span>Confidence: <strong>{Math.round(Number(inv.confidence_score) * 100)}%</strong></span>
          )}
          <span>Started: {new Date(inv.created_at).toLocaleString()}</span>
        </div>
      </header>

      {inv.summary && (
        <section className={styles.summary}>
          <h2>Summary</h2>
          <p>{inv.summary}</p>
        </section>
      )}

      <div className={styles.grid}>
        <div className={styles.left}>
          {(inv.attack_chain as string[])?.length > 0 && (
            <AttackTimeline chain={inv.attack_chain as string[]} />
          )}
          <ReasoningChain steps={inv.reasoning_chain as never} />
        </div>
        <div className={styles.right}>
          <ActionPanel
            investigationId={inv.id}
            actions={actions ?? []}
          />
        </div>
      </div>
    </main>
  )
}
