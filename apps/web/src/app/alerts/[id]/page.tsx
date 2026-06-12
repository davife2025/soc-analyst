import { createServiceClient } from '@soc/db'
import { requireAuth } from '@soc/auth'
import { notFound } from 'next/navigation'
import styles from './alert.module.css'
import { AlertStatusEditor } from '../../../components/AlertStatusEditor'
import { AlertRawEvent } from '../../../components/AlertRawEvent'
import { AlertNotes } from '../../../components/AlertNotes'
import { SeverityBadge, StatusPill } from '@soc/ui'
import type { Database } from '@soc/db'

export const dynamic = 'force-dynamic'

type AlertNote = Database['public']['Tables']['alert_notes']['Row']

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAuth()
  const db = createServiceClient()

  const [{ data: alert, error }, { data: investigations }, { data: notes }] = await Promise.all([
    db.from('alerts').select('*').eq('id', id).single(),
    db.from('investigations').select('id, status, confidence_score, summary, created_at')
      .eq('alert_id', id).order('created_at', { ascending: false }),
    db.from('alert_notes').select('*').eq('alert_id', id).order('created_at', { ascending: true }),
  ])

  if (error || !alert) notFound()

  return (
    <main className={styles.main}>
      <div className={styles.breadcrumb}>
        <a href="/dashboard">← Dashboard</a>
        <span>/</span>
        <span>Alert</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <SeverityBadge severity={alert.severity as never} />
          <h1 className={styles.title}>{alert.title}</h1>
          <StatusPill status={alert.status as never} />
        </div>
        <div className={styles.meta}>
          {alert.source_ip   && <span>src: <code>{alert.source_ip}</code></span>}
          {alert.dest_ip     && <span>dst: <code>{alert.dest_ip}</code></span>}
          {alert.source_host && <span>host: <code>{alert.source_host}</code></span>}
          <span>{new Date(alert.created_at).toLocaleString()}</span>
          <span className={styles.eventId}>ID: {alert.splunk_event_id}</span>
        </div>
        {alert.tags?.length > 0 && (
          <div className={styles.tags}>
            {alert.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
          </div>
        )}
      </header>

      <div className={styles.grid}>
        <div className={styles.left}>

          {/* Status editor */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Status & Severity</h2>
            <AlertStatusEditor
              alertId={alert.id}
              currentStatus={alert.status}
              currentSeverity={alert.severity}
              canEdit={user.role === 'admin' || user.role === 'analyst'}
            />
          </section>

          {/* Linked investigations */}
          {investigations && investigations.length > 0 && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Investigations ({investigations.length})</h2>
              <div className={styles.invList}>
                {investigations.map(inv => (
                  <a key={inv.id} href={`/investigations/${inv.id}`} className={styles.invRow}>
                    <StatusPill status={inv.status as never} />
                    {inv.confidence_score != null && (
                      <span className={styles.conf}>{Math.round(Number(inv.confidence_score) * 100)}% confidence</span>
                    )}
                    <span className={styles.invDate}>{new Date(inv.created_at).toLocaleString()}</span>
                    <span className={styles.invArrow}>→</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Analyst notes */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Analyst Notes</h2>
            <AlertNotes
              alertId={alert.id}
              initialNotes={notes as AlertNote[] ?? []}
              currentUserEmail={user.email}
              canWrite={user.role === 'admin' || user.role === 'analyst'}
            />
          </section>

        </div>

        <div className={styles.right}>
          {/* Raw event viewer */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Raw Event</h2>
            <AlertRawEvent rawEvent={alert.raw_event as Record<string, unknown>} />
          </section>
        </div>
      </div>
    </main>
  )
}
