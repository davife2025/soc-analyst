import express from 'express'
import { createServiceClient } from '@soc/db'
import { normalizeEvent } from '@soc/splunk'
import type { SplunkEvent } from '@soc/splunk'

const app = express()
app.use(express.json())

const PORT = process.env.PORT ?? 4000

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Splunk HEC-compatible endpoint
app.post('/services/collector/event', async (req, res) => {
  const db = createServiceClient()

  try {
    const body = req.body as { event?: SplunkEvent; sourcetype?: string }
    const event = body.event ?? req.body as SplunkEvent

    const normalized = normalizeEvent(event, req.headers['x-splunk-alert-name'] as string | undefined)

    const { data, error } = await db.from('alerts').upsert(
      {
        splunk_event_id: normalized.splunkEventId,
        title: normalized.title,
        severity: normalized.severity,
        raw_event: normalized.rawEvent,
        source_ip: normalized.sourceIp,
        dest_ip: normalized.destIp,
        source_host: normalized.sourceHost,
        tags: normalized.tags,
        status: 'new',
      },
      { onConflict: 'splunk_event_id', ignoreDuplicates: true }
    ).select().single()

    if (error) throw error

    console.log(`[ingest] Alert ingested: ${data?.id} (${normalized.severity}: ${normalized.title})`)
    res.status(200).json({ text: 'Success', code: 0 })
  } catch (err) {
    console.error('[ingest] Error:', err)
    res.status(500).json({ text: 'Internal error', code: 8 })
  }
})

// Bulk ingest endpoint
app.post('/api/alerts/bulk', async (req, res) => {
  const db = createServiceClient()
  const events = req.body as SplunkEvent[]
  const results = []

  for (const event of events) {
    const normalized = normalizeEvent(event)
    const { data } = await db.from('alerts').upsert(
      { ...normalized, status: 'new' as const },
      { onConflict: 'splunk_event_id', ignoreDuplicates: true }
    ).select().single()
    if (data) results.push(data.id)
  }

  res.json({ ingested: results.length })
})

app.listen(PORT, () => {
  console.log(`[ingest] Listening on port ${PORT}`)
})
