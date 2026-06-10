import { createServiceClient } from '@soc/db'
import { requireAuth } from '@soc/auth'
import styles from './audit.module.css'
import { AuditTable } from '../../components/AuditTable'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { entity_type?: string; page?: string }
}) {
  await requireAuth('analyst')
  const db = createServiceClient()
  const page = Number(searchParams.page ?? 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = db
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (searchParams.entity_type) {
    query = query.eq('entity_type', searchParams.entity_type)
  }

  const { data: logs, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const entityTypes = ['alert', 'investigation', 'action', 'playbook', 'token']

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <a href="/dashboard" className={styles.back}>← Dashboard</a>
          <h1>Audit Log</h1>
          <p className={styles.sub}>Immutable record of every agent decision and analyst action</p>
        </div>
        <div className={styles.stats}>
          <span className={styles.statItem}>{count ?? 0} total entries</span>
        </div>
      </header>

      <div className={styles.filters}>
        {['all', ...entityTypes].map(type => (
          <a
            key={type}
            href={type === 'all' ? '/audit' : `/audit?entity_type=${type}`}
            className={searchParams.entity_type === type || (!searchParams.entity_type && type === 'all')
              ? styles.filterActive : styles.filter}
          >
            {type}
          </a>
        ))}
      </div>

      <AuditTable logs={logs ?? []} />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && (
            <a href={`/audit?page=${page - 1}${searchParams.entity_type ? `&entity_type=${searchParams.entity_type}` : ''}`}
              className={styles.pageBtn}>← Prev</a>
          )}
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={`/audit?page=${page + 1}${searchParams.entity_type ? `&entity_type=${searchParams.entity_type}` : ''}`}
              className={styles.pageBtn}>Next →</a>
          )}
        </div>
      )}
    </main>
  )
}
