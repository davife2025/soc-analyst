import { createServiceClient } from '@soc/db'
import { investigateAlert, matchPlaybooks, executePlaybook, notifyAllChannels } from '@soc/ai'
import { toolHandlers } from './tools'
import { runScheduler } from './scheduler'
import { startHeartbeat } from './heartbeat'

const POLL_INTERVAL_MS  = Number(process.env.POLL_INTERVAL_MS  ?? 30_000)
const SCHED_INTERVAL_MS = Number(process.env.SCHED_INTERVAL_MS ?? 60_000)
const AGENT_VERSION = process.env.AGENT_VERSION ?? '1.0.0'
const MAX_CONCURRENT = 3

function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'HUGGINGFACE_API_KEY']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) { console.error(`[agent] Missing env vars: ${missing.join(', ')}`); process.exit(1) }
}

async function run() {
  validateEnv()
  console.log(`[agent] SOC Analyst Agent v${AGENT_VERSION} starting`)

  // Health endpoint for Render
  if (process.env.PORT) {
    const { createServer } = await import('http')
    createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', version: AGENT_VERSION }))
    }).listen(Number(process.env.PORT), () =>
      console.log(`[agent] Health check on port ${process.env.PORT}`)
    )
  }

  // Start heartbeat
  await startHeartbeat()

  // Scheduler loop
  const schedLoop = async () => {
    while (true) {
      try { await runScheduler() } catch (e) { console.error('[scheduler] error:', e) }
      await sleep(SCHED_INTERVAL_MS)
    }
  }

  // Alert processing loop
  const pollLoop = async () => {
    while (true) {
      try { await processNewAlerts() } catch (e) { console.error('[agent] error:', e) }
      await sleep(POLL_INTERVAL_MS)
    }
  }

  await Promise.allSettled([schedLoop(), pollLoop()])
}

async function processNewAlerts() {
  const db = createServiceClient()
  const { data: alerts, error } = await db
    .from('alerts').select('*').eq('status', 'new')
    .order('created_at', { ascending: true }).limit(MAX_CONCURRENT)
  if (error) { console.error('[agent] DB error:', error.message); return }
  if (!alerts?.length) return
  console.log(`[agent] Processing ${alerts.length} alert(s)`)
  await Promise.allSettled(alerts.map(a => processAlert(db, a)))
}

async function processAlert(
  db: ReturnType<typeof createServiceClient>,
  alert: { id: string; title: string; severity: string; raw_event: Record<string, unknown>; source_ip: string | null; dest_ip: string | null }
) {
  console.log(`[agent] → ${alert.title} (${alert.id.slice(0,8)})`)
  const { error: claimErr } = await db.from('alerts').update({ status: 'investigating' })
    .eq('id', alert.id).eq('status', 'new')
  if (claimErr) return

  const { data: inv, error: invErr } = await db.from('investigations').insert({
    alert_id: alert.id, status: 'running', reasoning_chain: [], attack_chain: [], agent_version: AGENT_VERSION,
  }).select().single()
  if (invErr || !inv) { await db.from('alerts').update({ status: 'new' }).eq('id', alert.id); return }

  try {
    const result = await investigateAlert(
      { alertId: alert.id, alertTitle: alert.title, severity: alert.severity,
        rawEvent: alert.raw_event, sourceIp: alert.source_ip, destIp: alert.dest_ip },
      toolHandlers(db)
    )
    const status = result.confidenceScore < 0.3 ? 'needs_review' : 'complete'
    await db.from('investigations').update({
      status, reasoning_chain: result.reasoningChain as never,
      summary: result.summary, confidence_score: result.confidenceScore,
      attack_chain: result.attackChain,
    }).eq('id', inv.id)

    for (const action of result.recommendedActions) {
      await db.from('actions').insert({
        investigation_id: inv.id, action_type: action.actionType,
        description: action.description, parameters: action.parameters,
        status: action.requiresApproval ? 'pending' : 'approved',
      })
    }

    if (status === 'complete') {
      const { data: fullAlert } = await db.from('alerts').select('*').eq('id', alert.id).single()
      if (fullAlert) {
        const updatedInv = { ...inv, status, confidence_score: result.confidenceScore, attack_chain: result.attackChain }
        const matches = await matchPlaybooks(updatedInv as never, fullAlert, db)
        for (const match of matches) await executePlaybook(match, updatedInv as never, db)
        if (fullAlert.severity === 'critical' || fullAlert.severity === 'high') {
          await notifyAllChannels({ alert: fullAlert, investigation: { ...updatedInv, summary: result.summary, reasoning_chain: result.reasoningChain as never } as never }, db)
        }
      }
    }

    await db.from('audit_log').insert({
      entity_type: 'investigation', entity_id: inv.id, action: status,
      actor: `agent@${AGENT_VERSION}`, before: null,
      after: { summary: result.summary, confidence: result.confidenceScore, status },
      metadata: { alert_id: alert.id },
    })
    console.log(`[agent] ✓ ${inv.id.slice(0,8)} (${Math.round(result.confidenceScore * 100)}%)`)
  } catch (err) {
    console.error(`[agent] ✗ ${alert.id}:`, err)
    await db.from('investigations').update({ status: 'needs_review' }).eq('id', inv.id)
    await db.from('audit_log').insert({
      entity_type: 'investigation', entity_id: inv.id, action: 'error',
      actor: `agent@${AGENT_VERSION}`, before: null, after: { error: String(err) }, metadata: { alert_id: alert.id },
    })
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
run().catch(err => { console.error('[agent] Fatal:', err); process.exit(1) })
