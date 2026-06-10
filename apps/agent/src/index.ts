import { createServiceClient } from '@soc/db'
import { investigateAlert, matchPlaybooks, executePlaybook } from '@soc/ai'
import { SplunkClient } from '@soc/splunk'
import { toolHandlers } from './tools'

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 30_000)
const AGENT_VERSION = '1.0.0'
const MAX_CONCURRENT = 3

// Validate required env vars on startup
function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'HUGGINGFACE_API_KEY']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    console.error(`[agent] Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }
}

async function run() {
  validateEnv()
  console.log(`[agent] SOC Analyst Agent v${AGENT_VERSION} starting`)
  console.log(`[agent] Poll interval: ${POLL_INTERVAL_MS}ms`)

  // Health check endpoint for Render
  if (process.env.PORT) {
    const { createServer } = await import('http')
    createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', version: AGENT_VERSION }))
    }).listen(Number(process.env.PORT), () => {
      console.log(`[agent] Health check listening on port ${process.env.PORT}`)
    })
  }

  while (true) {
    try {
      await processNewAlerts()
    } catch (err) {
      console.error('[agent] Unhandled error in poll cycle:', err)
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

async function processNewAlerts() {
  const db = createServiceClient()

  const { data: alerts, error } = await db
    .from('alerts')
    .select('*')
    .eq('status', 'new')
    .order('created_at', { ascending: true })
    .limit(MAX_CONCURRENT)

  if (error) { console.error('[agent] DB error fetching alerts:', error.message); return }
  if (!alerts?.length) return

  console.log(`[agent] Processing ${alerts.length} alert(s)`)

  // Process concurrently up to MAX_CONCURRENT
  await Promise.allSettled(alerts.map(alert => processAlert(db, alert)))
}

async function processAlert(
  db: ReturnType<typeof createServiceClient>,
  alert: {
    id: string; title: string; severity: string
    raw_event: Record<string, unknown>
    source_ip: string | null; dest_ip: string | null
  }
) {
  console.log(`[agent] → ${alert.title} (${alert.id.slice(0, 8)})`)

  // Claim alert (prevent double-processing if multiple agent instances)
  const { error: claimErr } = await db
    .from('alerts')
    .update({ status: 'investigating' })
    .eq('id', alert.id)
    .eq('status', 'new') // Only update if still 'new'

  if (claimErr) { console.warn(`[agent] Could not claim alert ${alert.id}`); return }

  const { data: inv, error: invErr } = await db
    .from('investigations')
    .insert({
      alert_id: alert.id,
      status: 'running',
      reasoning_chain: [],
      attack_chain: [],
      agent_version: AGENT_VERSION,
    })
    .select()
    .single()

  if (invErr || !inv) {
    console.error('[agent] Failed to create investigation:', invErr?.message)
    await db.from('alerts').update({ status: 'new' }).eq('id', alert.id) // Release claim
    return
  }

  try {
    const result = await investigateAlert(
      {
        alertId: alert.id,
        alertTitle: alert.title,
        severity: alert.severity,
        rawEvent: alert.raw_event,
        sourceIp: alert.source_ip,
        destIp: alert.dest_ip,
      },
      toolHandlers(db)
    )

    const status = result.confidenceScore < 0.3 ? 'needs_review' : 'complete'

    await db.from('investigations').update({
      status,
      reasoning_chain: result.reasoningChain as never,
      summary: result.summary,
      confidence_score: result.confidenceScore,
      attack_chain: result.attackChain,
    }).eq('id', inv.id)

    // Insert recommended actions
    for (const action of result.recommendedActions) {
      await db.from('actions').insert({
        investigation_id: inv.id,
        action_type: action.actionType,
        description: action.description,
        parameters: action.parameters,
        status: action.requiresApproval ? 'pending' : 'approved',
      })
    }

    // Run playbook matching
    if (status === 'complete') {
      const { data: fullAlert } = await db.from('alerts').select('*').eq('id', alert.id).single()
      if (fullAlert) {
        const updatedInv = { ...inv, status, confidence_score: result.confidenceScore, attack_chain: result.attackChain }
        const matches = await matchPlaybooks(updatedInv as never, fullAlert, db)
        for (const match of matches) {
          console.log(`[agent] Playbook matched: ${match.playbook.name}`)
          const { actionsCreated, autoExecuted } = await executePlaybook(match, updatedInv as never, db)
          console.log(`[agent] ${match.playbook.name}: ${actionsCreated} actions, ${autoExecuted} auto-executed`)
        }
      }
    }

    // Audit log
    await db.from('audit_log').insert({
      entity_type: 'investigation',
      entity_id: inv.id,
      action: status,
      actor: `agent@${AGENT_VERSION}`,
      before: null,
      after: { summary: result.summary, confidence: result.confidenceScore, status },
      metadata: { alert_id: alert.id },
    })

    console.log(`[agent] ✓ ${inv.id.slice(0, 8)} complete (confidence: ${Math.round(result.confidenceScore * 100)}%)`)

  } catch (err) {
    console.error(`[agent] ✗ Investigation failed for ${alert.id}:`, err)
    await db.from('investigations').update({ status: 'needs_review' }).eq('id', inv.id)
    await db.from('audit_log').insert({
      entity_type: 'investigation',
      entity_id: inv.id,
      action: 'error',
      actor: `agent@${AGENT_VERSION}`,
      before: null,
      after: { error: String(err) },
      metadata: { alert_id: alert.id },
    })
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
run().catch(err => { console.error('[agent] Fatal:', err); process.exit(1) })
