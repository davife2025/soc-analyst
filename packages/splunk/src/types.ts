export interface SplunkEvent {
  _time: string
  _raw: string
  source: string
  sourcetype: string
  host: string
  index: string
  [key: string]: unknown
}

export interface SplunkSearchResult {
  results: SplunkEvent[]
  fields: string[]
  messages: Array<{ type: string; text: string }>
}

export interface SplunkAlert {
  sid: string
  name: string
  description: string
  results_link: string
  result: Record<string, unknown>
}
