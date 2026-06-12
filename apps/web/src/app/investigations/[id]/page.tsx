import { createServiceClient } from '@soc/db'
import { requireAuth } from '@soc/auth'
import { notFound } from 'next/navigation'
import styles from './investigation.module.css'
import { ReasoningChain } from '../../../components/ReasoningChain'
import { AttackTimeline } from '../../../components/AttackTimeline'
import { ActionPanel } from '../../../components/ActionPanel'
import { ExportButtons } from '../../../components/ExportButtons'
import { SeverityBadge, StatusPill } from '@soc/ui'
import type { Database } from '@soc/db'

export const dynamic = 'force-dynamic'
type AlertRow = Database['public']['Tables']['alerts']['Row']
interface InvWithAlert {
  id: string; created_at: string; updated_at: string; alert_id: string; status: string
  reasoning_chain: unknown[]; summary: string | null; confidence_score: number | null
  attack_chain: string[]; agent_version: string; alerts: AlertRow | null
}

export default async function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAuth()
  const db = createServiceClient()

  const { data: inv, error } = await db.from('investigations').select('*, alerts(*)').eq('id', id).single()
  if (error || !inv) notFound()
  const typedInv = inv as unknown as InvWithAlert
  const { data: actions } = await db.from('actions').select('*').eq('investigation_id', id).order('created_at', { ascending: true })
  const alert = typedInv.alerts

  return (
    <main className={styles.main}>
      <div className={styles.breadcrumb}>
        <a href="/dashboard">← Dashboard</a>
        <span>/</span>
        {alert && <a href={`/alerts/${alert.id}`}>{alert.title.slice(0, 40)}{alert.title.length > 40 ? '…' : ''}</a>}
        <span>/</span>
        <span>Investigation</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          {alert && <SeverityBadge severity={alert.severity as never} />}
          <h1 className={styles.title}>{alert?.title ?? 'Investigation'}</h1>
          <StatusPill status={typedInv.status as never} />
        </div>
        <div className={styles.meta}>
          {alert?.source_ip && <span>Source IP: <code>{alert.source_ip}</code></span>}
          {typedInv.confidence_score != null && (
            <span>Confidence: <strong>{Math.round(Number(typedInv.confidence_score) * 100)}%</strong></span>
          )}
          <span>Started: {new Date(typedInv.created_at).toLocaleString()}</span>
          <a href={`/audit?entity_type=investigation`} className={styles.auditLink}>Audit log →</a>
          <div className={styles.exportWrap}>
            <ExportButtons type="investigation" investigationId={id} />
          </div>
        </div>
      </header>

      {typedInv.summary && (
        <section className={styles.summary}>
          <h2>Summary</h2>
          <p>{typedInv.summary}</p>
        </section>
      )}
      {!typedInv.summary && typedInv.status === 'running' && (
        <section className={styles.summary}>
          <div className={styles.running}>
            <span className={styles.spinner} />
            Agent is investigating — results will appear automatically
          </div>
        </section>
      )}

      <div className={styles.grid}>
        <div className={styles.left}>
          {(typedInv.attack_chain as string[])?.length > 0 && (
            <AttackTimeline chain={typedInv.attack_chain as string[]} />
          )}
          <ReasoningChain steps={typedInv.reasoning_chain as never} />
        </div>
        <div className={styles.right}>
          <ActionPanel investigationId={typedInv.id} actions={actions ?? []} />
        </div>
      </div>
    </main>
  )
}
