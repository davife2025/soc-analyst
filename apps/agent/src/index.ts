import { createServiceClient } from '@soc/db'
import { investigateAlert, matchPlaybooks, executePlaybook } from '@soc/ai'
import { SplunkClient } from '@soc/splunk'
import { toolHandlers } from './tools'

const POLL_INTERVAL_MS = 30_000
const AGENT_VERSION = '1.0.0'

async function run() {
  console.log(`[agent] Starting SOC Analyst Agent v${AGENT_VERSION}`)
  const db = createServiceClient()
  const splunk = new SplunkClient()

  while (true) {
    try {
      await processNewAlerts(db, splunk)
    } catch (err) {
      console.error('[agent] Error in poll cycle:', err)
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

async function processNewAlerts(db: ReturnType<typeof createServiceClient>, _splunk: SplunkClient) {
  const { data: alerts, error } = await db
    .from('alerts').select('*').eq('status', 'new')
    .order('created_at', { ascending: true }).limit(5)

  if (error) throw error
  if (!alerts?.length) return

  console.log(`[agent] Processing ${alerts.length} new alert(s)`)
  for (const alert of alerts) await processAlert(db, alert)
}

async function processAlert(
  db: ReturnType<typeof createServiceClient>,
  alert: { id: string; title: string; severity: string; raw_event: Record<string, unknown>; source_ip: string | null; dest_ip: string | null }
) {
  console.log(`[agent] Investigating: ${alert.title}`)
  await db.from('alerts').update({ status: 'investigating' }).eq('id', alert.id)

  const { data: inv, error: invErr } = await db.from('investigations').insert({
    alert_id: alert.id, status: 'running',
    reasoning_chain: [], attack_chain: [], agent_version: AGENT_VERSION,
  }).select().single()

  if (invErr || !inv) { console.error('[agent] Failed to create investigation:', invErr); return }

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

    // ── Run playbook matching ───────────────────────────────────
    if (status === 'complete') {
      const updatedInv = { ...inv, status, confidence_score: result.confidenceScore,
        attack_chain: result.attackChain, reasoning_chain: result.reasoningChain }
      const fullAlert = await db.from('alerts').select('*').eq('id', alert.id).single()
      if (fullAlert.data) {
        const matches = await matchPlaybooks(updatedInv as never, fullAlert.data, db)
        for (const match of matches) {
          console.log(`[agent] Playbook matched: ${match.playbook.name}`)
          const { actionsCreated, autoExecuted } = await executePlaybook(match, updatedInv as never, db)
          console.log(`[agent] Playbook ${match.playbook.name}: ${actionsCreated} actions, ${autoExecuted} auto-executed`)
        }
      }
    }

    await db.from('audit_log').insert({
      entity_type: 'investigation', entity_id: inv.id,
      action: 'complete', actor: `agent@${AGENT_VERSION}`, before: null,
      after: { summary: result.summary, confidence: result.confidenceScore },
      metadata: { alert_id: alert.id },
    })

    console.log(`[agent] Done: ${inv.id} (confidence: ${result.confidenceScore})`)
  } catch (err) {
    console.error(`[agent] Failed for alert ${alert.id}:`, err)
    await db.from('investigations').update({ status: 'needs_review' }).eq('id', inv.id)
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
run().catch(console.error)
