import type { createServiceClient } from '@soc/db'
import { SplunkClient } from '@soc/splunk'

export function toolHandlers(db: ReturnType<typeof createServiceClient>) {
  const splunk = new SplunkClient()

  return {
    async lookup_threat_intel(params: { indicator: string; indicator_type: string }) {
      // Check cache first
      const { data } = await db
        .from('threat_intel')
        .select('*')
        .eq('indicator', params.indicator)
        .eq('indicator_type', params.indicator_type as never)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (data) return { cached: true, ...data }

      // TODO: integrate with real threat intel APIs (VirusTotal, AbuseIPDB, etc.)
      return { cached: false, indicator: params.indicator, threat_score: 0, source: 'none', details: {} }
    },

    async search_splunk(params: { query: string; timerange?: string }) {
      try {
        const results = await splunk.search(params.query, params.timerange)
        return { success: true, count: results.results.length, results: results.results.slice(0, 20) }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    },

    async get_host_context(params: { hostname: string }) {
      try {
        const results = await splunk.search(`host="${params.hostname}"`, '-24h')
        return {
          hostname: params.hostname,
          event_count_24h: results.results.length,
          recent_events: results.results.slice(0, 10),
        }
      } catch {
        return { hostname: params.hostname, event_count_24h: 0, recent_events: [] }
      }
    }
  }
}
