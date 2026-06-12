'use client'
import { useEffect, useState } from 'react'
import styles from './AnalyticsDashboard.module.css'

interface AnalyticsData {
  period: { days: number; since: string }
  severityCounts: { critical: number; high: number; medium: number; low: number; info: number }
  investigations: { total: number; complete: number; needs_review: number; running: number; avgConfidence: number; avgMttrMinutes: number }
  dailyAlerts: Array<{ date: string; critical: number; high: number; medium: number; low: number; total: number }>
  topHosts: Array<{ host: string; count: number }>
  topTags: Array<{ tag: string; count: number }>
}

const SEV_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#6b7280' }

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d as AnalyticsData); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  if (loading) return <div className={styles.loading}>Loading analytics…</div>
  if (!data) return <div className={styles.loading}>Failed to load analytics</div>

  const totalAlerts = Object.values(data.severityCounts).reduce((a, b) => a + b, 0)
  const maxDaily = Math.max(...data.dailyAlerts.map(d => d.total), 1)
  const maxHost = Math.max(...data.topHosts.map(h => h.count), 1)
  const maxTag = Math.max(...data.topTags.map(t => t.count), 1)

  return (
    <div className={styles.wrap}>
      {/* Period selector */}
      <div className={styles.periodRow}>
        {[7, 14, 30].map(d => (
          <button key={d} className={days === d ? styles.periodActive : styles.period}
            onClick={() => setDays(d)}>
            {d}d
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className={styles.kpis}>
        <KpiCard label="Total Alerts" value={totalAlerts} color="#e2e8f0" />
        <KpiCard label="Investigated" value={data.investigations.complete} color="#22c55e" />
        <KpiCard label="Needs Review" value={data.investigations.needs_review} color="#f59e0b" />
        <KpiCard label="Avg MTTR" value={`${data.investigations.avgMttrMinutes}m`} color="#3b82f6" />
        <KpiCard label="Avg Confidence" value={`${Math.round(data.investigations.avgConfidence * 100)}%`} color="#8b5cf6" />
      </div>

      <div className={styles.grid}>
        {/* Severity breakdown */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Severity Breakdown</h2>
          <div className={styles.sevBars}>
            {(Object.entries(data.severityCounts) as [keyof typeof SEV_COLORS, number][]).map(([sev, count]) => (
              <div key={sev} className={styles.sevRow}>
                <span className={styles.sevLabel}>{sev}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill}
                    style={{ width: `${totalAlerts ? (count / totalAlerts) * 100 : 0}%`, background: SEV_COLORS[sev] }} />
                </div>
                <span className={styles.sevCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily alert volume chart */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Daily Alert Volume</h2>
          <div className={styles.chart}>
            {data.dailyAlerts.map((day) => (
              <div key={day.date} className={styles.chartCol}>
                <div className={styles.barStack}>
                  {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
                    day[sev] > 0 && (
                      <div key={sev} className={styles.stackSegment}
                        style={{ height: `${(day[sev] / maxDaily) * 100}%`, background: SEV_COLORS[sev] }}
                        title={`${sev}: ${day[sev]}`}
                      />
                    )
                  ))}
                </div>
                <span className={styles.chartLabel}>{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top source hosts */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Top Source Hosts</h2>
          {data.topHosts.length === 0
            ? <p className={styles.empty}>No host data yet</p>
            : <div className={styles.hostList}>
              {data.topHosts.map(({ host, count }) => (
                <div key={host} className={styles.hostRow}>
                  <span className={styles.hostName}>{host}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill}
                      style={{ width: `${(count / maxHost) * 100}%`, background: '#3b82f6' }} />
                  </div>
                  <span className={styles.hostCount}>{count}</span>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Top tags */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Top Alert Tags</h2>
          {data.topTags.length === 0
            ? <p className={styles.empty}>No tag data yet</p>
            : <div className={styles.tagCloud}>
              {data.topTags.map(({ tag, count }) => {
                const size = 11 + Math.round((count / maxTag) * 8)
                return (
                  <span key={tag} className={styles.tag}
                    style={{ fontSize: size, opacity: 0.5 + (count / maxTag) * 0.5 }}>
                    {tag}
                    <span className={styles.tagCount}>{count}</span>
                  </span>
                )
              })}
            </div>
          }
        </div>
      </div>

      {/* Investigation funnel */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Investigation Funnel</h2>
        <div className={styles.funnel}>
          {[
            { label: 'Total Alerts',    value: totalAlerts,                    color: '#334155' },
            { label: 'Investigated',    value: data.investigations.total,      color: '#1d4ed8' },
            { label: 'Complete',        value: data.investigations.complete,   color: '#15803d' },
            { label: 'Needs Review',    value: data.investigations.needs_review, color: '#b45309' },
          ].map(({ label, value, color }) => (
            <div key={label} className={styles.funnelStep}>
              <div className={styles.funnelBar}
                style={{ width: `${totalAlerts ? (value / totalAlerts) * 100 : 0}%`, minWidth: value > 0 ? 4 : 0, background: color }} />
              <div className={styles.funnelMeta}>
                <span className={styles.funnelLabel}>{label}</span>
                <span className={styles.funnelValue}>{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiValue} style={{ color }}>{value}</span>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  )
}
