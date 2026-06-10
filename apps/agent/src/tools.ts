import type { createServiceClient } from '@soc/db'
import { SplunkClient } from '@soc/splunk'
import { lookupThreatIntel } from '@soc/ai'

export function toolHandlers(db: ReturnType<typeof createServiceClient>) {
  const splunk = new SplunkClient()

  return {
    async lookup_threat_intel(params: { indicator: string; indicator_type: 'ip' | 'domain' | 'hash' | 'cve' }) {
      const { data: cached } = await db
        .from('threat_intel')
        .select('*')
        .eq('indicator', params.indicator)
        .eq('indicator_type', params.indicator_type)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (cached) {
        console.log(`[tools] Cache hit: ${params.indicator}`)
        return { cached: true, threat_score: cached.threat_score, malicious: Number(cached.threat_score) > 0.5, details: cached.details, source: cached.source }
      }

      console.log(`[tools] Fetching threat intel: ${params.indicator}`)
      const result = await lookupThreatIntel(params.indicator, params.indicator_type)

      await db.from('threat_intel').upsert({
        indicator: result.indicator,
        indicator_type: result.indicatorType,
        threat_score: result.threatScore,
        source: result.source,
        details: result.details,
        expires_at: result.expiresAt,
      }, { onConflict: 'indicator,indicator_type' })

      return { cached: false, threat_score: result.threatScore, malicious: result.malicious, source: result.source, details: result.details }
    },

    async search_splunk(params: { query: string; timerange?: string }) {
      try {
        const results = await splunk.search(params.query, params.timerange ?? '-1h')
        return { success: true, count: results.results.length, results: results.results.slice(0, 20) }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    },

    async get_host_context(params: { hostname: string }) {
      try {
        const results = await splunk.search(`host="${params.hostname}"`, '-24h')
        return { hostname: params.hostname, event_count_24h: results.results.length, recent_events: results.results.slice(0, 10) }
      } catch {
        return { hostname: params.hostname, event_count_24h: 0, recent_events: [] }
      }
    }
  }
}
