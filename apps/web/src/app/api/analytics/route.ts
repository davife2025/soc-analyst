import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const db = createServiceClient()
  const { searchParams } = new URL(req.url)
  const days = Math.min(Number(searchParams.get('days') ?? 30), 90)
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  const [
    { data: alertsBySeverity },
    { data: alertsByDay },
    { data: investigations },
    { data: recentAlerts },
    { data: topHosts },
    { data: topTags },
  ] = await Promise.all([
    // Severity breakdown
    db.from('alerts').select('severity').gte('created_at', since),

    // Alerts per day (last N days)
    db.rpc('alerts_by_day', { since_date: since }).catch(() => ({ data: null })),

    // Investigation metrics
    db.from('investigations').select('status, confidence_score, created_at, updated_at')
      .gte('created_at', since),

    // Recent 7d alert volume
    db.from('alerts').select('created_at, severity, status')
      .gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString())
      .order('created_at', { ascending: true }),

    // Top source hosts
    db.from('alerts').select('source_host').gte('created_at', since).not('source_host', 'is', null),

    // Top tags
    db.from('alerts').select('tags').gte('created_at', since),
  ])

  // Severity breakdown counts
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  for (const a of alertsBySeverity ?? []) {
    if (a.severity in severityCounts) severityCounts[a.severity as keyof typeof severityCounts]++
  }

  // Investigation stats
  const invStats = {
    total: investigations?.length ?? 0,
    complete: investigations?.filter(i => i.status === 'complete').length ?? 0,
    needs_review: investigations?.filter(i => i.status === 'needs_review').length ?? 0,
    running: investigations?.filter(i => i.status === 'running').length ?? 0,
    avgConfidence: 0,
    avgMttrMinutes: 0,
  }

  const withConfidence = investigations?.filter(i => i.confidence_score != null) ?? []
  if (withConfidence.length) {
    invStats.avgConfidence = withConfidence.reduce((s, i) => s + Number(i.confidence_score), 0) / withConfidence.length
  }

  // MTTR: time from alert created → investigation updated (proxy for resolution time)
  const resolved = investigations?.filter(i => i.status === 'complete' && i.updated_at) ?? []
  if (resolved.length) {
    const totalMs = resolved.reduce((s, i) => {
      return s + (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime())
    }, 0)
    invStats.avgMttrMinutes = Math.round(totalMs / resolved.length / 60_000)
  }

  // Alerts per day (last 7d) — manual bucketing if rpc not available
  const daily: Record<string, { date: string; critical: number; high: number; medium: number; low: number; total: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000)
    const key = d.toISOString().slice(0, 10)
    daily[key] = { date: key, critical: 0, high: 0, medium: 0, low: 0, total: 0 }
  }
  for (const a of recentAlerts ?? []) {
    const key = a.created_at.slice(0, 10)
    if (daily[key]) {
      daily[key].total++
      if (a.severity in daily[key]) daily[key][a.severity as 'critical' | 'high' | 'medium' | 'low']++
    }
  }

  // Top 5 source hosts
  const hostCounts: Record<string, number> = {}
  for (const a of topHosts ?? []) {
    if (a.source_host) hostCounts[a.source_host] = (hostCounts[a.source_host] ?? 0) + 1
  }
  const topHostsList = Object.entries(hostCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([host, count]) => ({ host, count }))

  // Top 8 tags
  const tagCounts: Record<string, number> = {}
  for (const a of topTags ?? []) {
    for (const tag of (a.tags as string[]) ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }
  }
  const topTagsList = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([tag, count]) => ({ tag, count }))

  return NextResponse.json({
    period: { days, since },
    severityCounts,
    investigations: invStats,
    dailyAlerts: Object.values(daily),
    topHosts: topHostsList,
    topTags: topTagsList,
  })
}
