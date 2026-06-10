export interface ThreatIntelResult {
  indicator: string
  indicatorType: 'ip' | 'domain' | 'hash' | 'cve'
  threatScore: number
  malicious: boolean
  source: string
  details: Record<string, unknown>
  expiresAt: string
}

// ── VirusTotal ──────────────────────────────────────────────────
export async function queryVirusTotal(
  indicator: string,
  type: 'ip' | 'domain' | 'hash'
): Promise<ThreatIntelResult> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY
  if (!apiKey) return emptyResult(indicator, type, 'virustotal-not-configured')

  const endpoints: Record<string, string> = {
    ip:     `https://www.virustotal.com/api/v3/ip_addresses/${indicator}`,
    domain: `https://www.virustotal.com/api/v3/domains/${indicator}`,
    hash:   `https://www.virustotal.com/api/v3/files/${indicator}`,
  }

  const res = await fetch(endpoints[type], {
    headers: { 'x-apikey': apiKey },
  })

  if (!res.ok) return emptyResult(indicator, type, 'virustotal')

  const data = await res.json() as {
    data: { attributes: { last_analysis_stats: { malicious: number; suspicious: number; harmless: number; undetected: number } } }
  }
  const stats = data.data?.attributes?.last_analysis_stats
  const total = (stats?.malicious ?? 0) + (stats?.suspicious ?? 0) + (stats?.harmless ?? 0) + (stats?.undetected ?? 0)
  const maliciousCount = (stats?.malicious ?? 0) + (stats?.suspicious ?? 0)
  const score = total > 0 ? maliciousCount / total : 0

  return {
    indicator,
    indicatorType: type,
    threatScore: Math.round(score * 1000) / 1000,
    malicious: maliciousCount > 3,
    source: 'virustotal',
    details: stats ?? {},
    expiresAt: ttl(24),
  }
}

// ── AbuseIPDB ───────────────────────────────────────────────────
export async function queryAbuseIPDB(ip: string): Promise<ThreatIntelResult> {
  const apiKey = process.env.ABUSEIPDB_API_KEY
  if (!apiKey) return emptyResult(ip, 'ip', 'abuseipdb-not-configured')

  const res = await fetch(
    `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose`,
    { headers: { Key: apiKey, Accept: 'application/json' } }
  )

  if (!res.ok) return emptyResult(ip, 'ip', 'abuseipdb')

  const { data } = await res.json() as {
    data: { abuseConfidenceScore: number; totalReports: number; countryCode: string; usageType: string; isp: string }
  }

  return {
    indicator: ip,
    indicatorType: 'ip',
    threatScore: (data?.abuseConfidenceScore ?? 0) / 100,
    malicious: (data?.abuseConfidenceScore ?? 0) > 50,
    source: 'abuseipdb',
    details: {
      totalReports: data?.totalReports,
      countryCode: data?.countryCode,
      usageType: data?.usageType,
      isp: data?.isp,
    },
    expiresAt: ttl(6),
  }
}

// ── NVD CVE lookup ──────────────────────────────────────────────
export async function queryCVE(cveId: string): Promise<ThreatIntelResult> {
  const res = await fetch(
    `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`
  )
  if (!res.ok) return emptyResult(cveId, 'cve', 'nvd')

  const data = await res.json() as {
    vulnerabilities: Array<{
      cve: {
        descriptions: Array<{ lang: string; value: string }>
        metrics: { cvssMetricV31?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }> }
      }
    }>
  }

  const vuln = data.vulnerabilities?.[0]?.cve
  const score = vuln?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ?? 0
  const desc = vuln?.descriptions?.find(d => d.lang === 'en')?.value ?? ''

  return {
    indicator: cveId,
    indicatorType: 'cve',
    threatScore: score / 10,
    malicious: score >= 7,
    source: 'nvd',
    details: { description: desc, cvssScore: score, severity: vuln?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity },
    expiresAt: ttl(168),
  }
}

// ── Unified lookup: tries multiple sources, merges scores ───────
export async function lookupThreatIntel(
  indicator: string,
  type: 'ip' | 'domain' | 'hash' | 'cve'
): Promise<ThreatIntelResult> {
  if (type === 'cve') return queryCVE(indicator)

  const results = await Promise.allSettled([
    queryVirusTotal(indicator, type as 'ip' | 'domain' | 'hash'),
    ...(type === 'ip' ? [queryAbuseIPDB(indicator)] : []),
  ])

  const fulfilled = results
    .filter((r): r is PromiseFulfilledResult<ThreatIntelResult> => r.status === 'fulfilled')
    .map(r => r.value)

  if (!fulfilled.length) return emptyResult(indicator, type, 'all-sources-failed')

  const maxScore = Math.max(...fulfilled.map(r => r.threatScore))
  const anyMalicious = fulfilled.some(r => r.malicious)
  const combined = fulfilled.reduce((acc, r) => ({ ...acc, ...r.details }), {} as Record<string, unknown>)

  return {
    indicator,
    indicatorType: type,
    threatScore: maxScore,
    malicious: anyMalicious,
    source: fulfilled.map(r => r.source).join('+'),
    details: combined,
    expiresAt: fulfilled[0].expiresAt,
  }
}

function ttl(hours: number) {
  return new Date(Date.now() + hours * 3600_000).toISOString()
}

function emptyResult(indicator: string, type: ThreatIntelResult['indicatorType'], source: string): ThreatIntelResult {
  return { indicator, indicatorType: type, threatScore: 0, malicious: false, source, details: {}, expiresAt: ttl(1) }
}
