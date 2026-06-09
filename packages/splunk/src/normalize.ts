import type { SplunkEvent } from './types'

export interface NormalizedAlert {
  splunkEventId: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  rawEvent: Record<string, unknown>
  sourceIp: string | null
  destIp: string | null
  sourceHost: string | null
  tags: string[]
}

export function normalizeEvent(event: SplunkEvent, alertName?: string): NormalizedAlert {
  return {
    splunkEventId: String(event._cd ?? event._time ?? Date.now()),
    title: alertName ?? String(event.source ?? 'Unknown Alert'),
    severity: parseSeverity(event),
    rawEvent: event as Record<string, unknown>,
    sourceIp: String(event.src_ip ?? event.src ?? event.source_ip ?? '') || null,
    destIp: String(event.dest_ip ?? event.dest ?? event.destination_ip ?? '') || null,
    sourceHost: String(event.host ?? '') || null,
    tags: parseTags(event),
  }
}

function parseSeverity(event: SplunkEvent): NormalizedAlert['severity'] {
  const raw = String(event.severity ?? event.alert_severity ?? '').toLowerCase()
  if (raw.includes('critical') || raw === '5') return 'critical'
  if (raw.includes('high') || raw === '4') return 'high'
  if (raw.includes('medium') || raw === '3') return 'medium'
  if (raw.includes('low') || raw === '2') return 'low'
  return 'info'
}

function parseTags(event: SplunkEvent): string[] {
  const tags = event.tags ?? event.tag ?? ''
  if (Array.isArray(tags)) return tags.map(String)
  if (typeof tags === 'string' && tags) return tags.split(',').map(s => s.trim())
  return []
}
