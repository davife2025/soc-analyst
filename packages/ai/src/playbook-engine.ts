import type { createServiceClient } from '@soc/db'
import type { Database } from '@soc/db'

type Action = Database['public']['Tables']['actions']['Row']
type Playbook = Database['public']['Tables']['playbooks']['Row']
type Investigation = Database['public']['Tables']['investigations']['Row']

export interface PlaybookMatch {
  playbook: Playbook
  matchedConditions: string[]
}

export async function matchPlaybooks(
  investigation: Investigation,
  alert: Database['public']['Tables']['alerts']['Row'],
  db: ReturnType<typeof createServiceClient>
): Promise<PlaybookMatch[]> {
  const { data: playbooks } = await db.from('playbooks').select('*').eq('active', true)
  if (!playbooks?.length) return []

  const matches: PlaybookMatch[] = []

  for (const pb of playbooks) {
    const conditions = pb.trigger_conditions as Record<string, unknown>
    const matched: string[] = []

    if (conditions.severity) {
      const required = Array.isArray(conditions.severity) ? conditions.severity : [conditions.severity]
      if (required.includes(alert.severity)) matched.push(`severity=${alert.severity}`)
    }

    if (conditions.min_confidence && investigation.confidence_score != null) {
      if (Number(investigation.confidence_score) >= Number(conditions.min_confidence)) {
        matched.push(`confidence>=${conditions.min_confidence}`)
      }
    }

    if (conditions.attack_chain_contains && Array.isArray(investigation.attack_chain)) {
      const keywords = Array.isArray(conditions.attack_chain_contains)
        ? conditions.attack_chain_contains
        : [conditions.attack_chain_contains]
      const chain = (investigation.attack_chain as string[]).join(' ').toLowerCase()
      for (const kw of keywords as string[]) {
        if (chain.includes(kw.toLowerCase())) matched.push(`chain contains "${kw}"`)
      }
    }

    if (conditions.tags && Array.isArray(alert.tags)) {
      const required = Array.isArray(conditions.tags) ? conditions.tags : [conditions.tags]
      for (const tag of required as string[]) {
        if (alert.tags.includes(tag)) matched.push(`tag=${tag}`)
      }
    }

    const requiredCount = Object.keys(conditions).length
    if (matched.length >= requiredCount && requiredCount > 0) {
      matches.push({ playbook: pb, matchedConditions: matched })
    }
  }

  return matches
}

export async function executePlaybook(
  match: PlaybookMatch,
  investigation: Investigation,
  db: ReturnType<typeof createServiceClient>
): Promise<{ actionsCreated: number; autoExecuted: number }> {
  const { playbook } = match
  const steps = playbook.steps as Array<{
    order: number; action: string
    parameters: Record<string, unknown>; requires_approval: boolean
  }>

  let actionsCreated = 0
  let autoExecuted = 0

  for (const step of steps.sort((a, b) => a.order - b.order)) {
    const requiresApproval = step.requires_approval || !playbook.auto_execute
    const status = requiresApproval ? 'pending' : 'approved'

    const { data: action } = await db.from('actions').insert({
      investigation_id: investigation.id,
      action_type: step.action,
      description: `[Playbook: ${playbook.name}] ${describeAction(step.action, step.parameters)}`,
      parameters: { ...step.parameters, playbook_id: playbook.id },
      status,
    }).select().single()

    if (action) {
      actionsCreated++
      if (status === 'approved') {
        await autoExecuteAction(action, db)
        autoExecuted++
      }
    }
  }

  await db.from('audit_log').insert({
    entity_type: 'playbook', entity_id: playbook.id,
    action: 'executed', actor: 'agent', before: null,
    after: { investigation_id: investigation.id, steps_created: actionsCreated },
    metadata: { matched_conditions: match.matchedConditions },
  })

  return { actionsCreated, autoExecuted }
}

async function autoExecuteAction(action: Action, db: ReturnType<typeof createServiceClient>) {
  let result = 'executed'
  try {
    switch (action.action_type) {
      case 'create_ticket':  result = await createTicket(action.parameters as Record<string,string>); break
      case 'notify_team':    result = await notifyTeam(action.parameters as Record<string,string>); break
      case 'add_to_watchlist': result = await addToWatchlist(action.parameters as Record<string,string>); break
      default:
        await db.from('actions').update({ status: 'pending' }).eq('id', action.id)
        return
    }
    await db.from('actions').update({ status: 'executed', executed_at: new Date().toISOString(), result }).eq('id', action.id)
  } catch (err) {
    await db.from('actions').update({ result: `Error: ${String(err)}`, status: 'pending' }).eq('id', action.id)
  }
}

async function createTicket(params: Record<string,string>) {
  console.log('[playbook] Creating ticket:', params)
  return `Ticket created: ${params.title ?? 'Security Incident'}`
}

async function notifyTeam(params: Record<string,string>) {
  const url = process.env.SLACK_WEBHOOK_URL
  if (url) {
    await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text: params.message ?? 'Security alert requires attention' }) })
    return 'Slack notification sent'
  }
  return 'Notification queued (no webhook configured)'
}

async function addToWatchlist(params: Record<string,string>) {
  return `Added ${params.indicator} to watchlist`
}

function describeAction(action: string, params: Record<string, unknown>) {
  const map: Record<string, string> = {
    block_ip: `Block IP ${params.ip ?? ''}`,
    isolate_host: `Isolate host ${params.hostname ?? ''}`,
    reset_credentials: `Reset credentials for ${params.user ?? ''}`,
    create_ticket: `Create incident ticket: ${params.title ?? ''}`,
    notify_team: `Notify team: ${params.message ?? ''}`,
    collect_forensics: `Collect forensics from ${params.hostname ?? ''}`,
    add_to_watchlist: `Add ${params.indicator ?? ''} to watchlist`,
  }
  return map[action] ?? action
}
