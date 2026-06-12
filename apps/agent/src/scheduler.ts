import { createServiceClient } from '@soc/db'
import { SplunkClient } from '@soc/splunk'
import { normalizeEvent } from '@soc/splunk'

interface Schedule {
  id: string
  name: string
  search_query: string
  timerange: string
  cron_expression: string
  active: boolean
  last_run_at: string | null
}

// Minimal cron parser — supports */N and exact minute patterns
function shouldRun(cronExpr: string, lastRunAt: string | null): boolean {
  const now = new Date()
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return false

  const [minute] = parts

  // */N — every N minutes
  const everyN = minute.match(/^\*\/(\d+)$/)
  if (everyN) {
    const intervalMin = parseInt(everyN[1])
    if (!lastRunAt) return true
    const msSince = now.getTime() - new Date(lastRunAt).getTime()
    return msSince >= intervalMin * 60 * 1000
  }

  // Exact minute — run once per hour at that minute
  const exactMin = parseInt(minute)
  if (!isNaN(exactMin)) {
    if (now.getMinutes() !== exactMin) return false
    if (!lastRunAt) return true
    const msSince = now.getTime() - new Date(lastRunAt).getTime()
    return msSince >= 55 * 60 * 1000 // at least 55m since last run
  }

  return false
}

export async function runScheduler(): Promise<void> {
  const db = createServiceClient()
  const splunk = new SplunkClient()

  const { data: schedules, error } = await db
    .from('splunk_schedules')
    .select('*')
    .eq('active', true)

  if (error) { console.error('[scheduler] DB error:', error.message); return }
  if (!schedules?.length) return

  for (const schedule of schedules as Schedule[]) {
    if (!shouldRun(schedule.cron_expression, schedule.last_run_at)) continue

    console.log(`[scheduler] Running: ${schedule.name}`)

    // Mark as running
    await db.from('splunk_schedules').update({
      last_run_at: new Date().toISOString(),
      last_run_status: 'running',
    }).eq('id', schedule.id)

    try {
      const results = await splunk.search(schedule.search_query, schedule.timerange)
      let alertsCreated = 0

      for (const event of results.results.slice(0, 50)) {
        const normalized = normalizeEvent(event, schedule.name)
        const { data } = await db.from('alerts').upsert(
          {
            splunk_event_id: normalized.splunkEventId,
            title: normalized.title,
            severity: normalized.severity,
            raw_event: normalized.rawEvent,
            source_ip: normalized.sourceIp,
            dest_ip: normalized.destIp,
            source_host: normalized.sourceHost,
            tags: [...normalized.tags, 'scheduled'],
            status: 'new',
          },
          { onConflict: 'splunk_event_id', ignoreDuplicates: true }
        ).select('id')

        if (data) alertsCreated++
      }

      await db.from('splunk_schedules').update({
        last_run_status: 'success',
        last_error: null,
        alerts_created_last_run: alertsCreated,
      }).eq('id', schedule.id)

      console.log(`[scheduler] ✓ ${schedule.name}: ${alertsCreated} alerts from ${results.results.length} events`)
    } catch (err) {
      const errMsg = String(err)
      await db.from('splunk_schedules').update({
        last_run_status: 'error',
        last_error: errMsg,
        alerts_created_last_run: 0,
      }).eq('id', schedule.id)
      console.error(`[scheduler] ✗ ${schedule.name}:`, errMsg)
    }
  }
}
