'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import styles from './InvestigationsList.module.css'

interface AlertInline {
  id: string; title: string; severity: string
  status: string; source_ip: string | null; created_at: string
}
interface Investigation {
  id: string; created_at: string; status: string
  confidence_score: number | null; summary: string | null
  attack_chain: string[]; alerts: AlertInline
}
interface Page { data: Investigation[]; total: number; page: number; limit: number }

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#6b7280'
}
const STATUS_COLORS: Record<string, string> = {
  complete: '#22c55e', running: '#f59e0b', needs_review: '#ef4444'
}

export function InvestigationsList() {
  const router = useRouter()
  const [results, setResults] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [page, setPage] = useState(1)
  const [inputVal, setInputVal] = useState('')

  const fetch_ = useCallback(async (opts: { q: string; status: string; severity: string; page: number }) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (opts.q)        params.set('q', opts.q)
    if (opts.status)   params.set('status', opts.status)
    if (opts.severity) params.set('severity', opts.severity)
    params.set('page', String(opts.page))
    const res = await fetch(`/api/investigations?${params}`)
    if (res.ok) setResults(await res.json() as Page)
    setLoading(false)
  }, [])

  useEffect(() => { fetch_({ q, status, severity, page }) }, [q, status, severity, page, fetch_])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQ(inputVal)
    setPage(1)
  }

  function clearFilters() {
    setQ(''); setStatus(''); setSeverity(''); setPage(1); setInputVal('')
  }

  const totalPages = results ? Math.ceil(results.total / results.limit) : 1
  const hasFilters = q || status || severity

  return (
    <div className={styles.wrap}>
      {/* Search + filters */}
      <div className={styles.controls}>
        <form className={styles.searchRow} onSubmit={handleSearch}>
          <input
            className={styles.searchInput}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Search by alert title…"
          />
          <button type="submit" className={styles.searchBtn}>Search</button>
          {hasFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>Clear</button>
          )}
        </form>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Status</span>
            {['', 'running', 'complete', 'needs_review'].map(s => (
              <button key={s}
                className={status === s ? styles.filterActive : styles.filter}
                onClick={() => { setStatus(s); setPage(1) }}>
                {s || 'All'}
              </button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Severity</span>
            {['', 'critical', 'high', 'medium', 'low'].map(s => (
              <button key={s}
                className={severity === s ? styles.filterActive : styles.filter}
                onClick={() => { setSeverity(s); setPage(1) }}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results summary */}
      {results && (
        <div className={styles.summary}>
          {results.total} investigation{results.total !== 1 ? 's' : ''}
          {hasFilters && ' (filtered)'}
        </div>
      )}

      {/* Results list */}
      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <div className={styles.list}>
          {results?.data.length === 0 && (
            <div className={styles.empty}>No investigations match your filters</div>
          )}
          {results?.data.map(inv => {
            const alert = inv.alerts
            return (
              <div
                key={inv.id}
                className={styles.card}
                onClick={() => router.push(`/investigations/${inv.id}`)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardLeft}>
                    {alert && (
                      <span className={styles.sevDot}
                        style={{ background: SEV_COLORS[alert.severity] ?? '#6b7280' }} />
                    )}
                    <span className={styles.cardTitle}>{alert?.title ?? 'Unknown Alert'}</span>
                  </div>
                  <div className={styles.cardRight}>
                    <span className={styles.statusBadge}
                      style={{ color: STATUS_COLORS[inv.status] ?? '#94a3b8' }}>
                      ● {inv.status.replace('_', ' ')}
                    </span>
                    {inv.confidence_score != null && (
                      <span className={styles.confidence}>
                        {Math.round(Number(inv.confidence_score) * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                {inv.summary && (
                  <p className={styles.summary_}>
                    {inv.summary.slice(0, 160)}{inv.summary.length > 160 ? '…' : ''}
                  </p>
                )}

                {inv.attack_chain?.length > 0 && (
                  <div className={styles.chain}>
                    {(inv.attack_chain as string[]).slice(0, 3).map((step, i) => (
                      <span key={i} className={styles.chainStep}>{step.split(':')[0]}</span>
                    ))}
                    {inv.attack_chain.length > 3 && (
                      <span className={styles.chainMore}>+{inv.attack_chain.length - 3} more</span>
                    )}
                  </div>
                )}

                <div className={styles.cardMeta}>
                  {alert?.source_ip && <span>src: {alert.source_ip}</span>}
                  <span>{new Date(inv.created_at).toLocaleString()}</span>
                  <span className={styles.viewLink}>View →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page === 1}
            onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
