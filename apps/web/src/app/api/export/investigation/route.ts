import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

function hr(char = '─', len = 60) { return char.repeat(len) }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const format = searchParams.get('format') ?? 'txt'

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = createServiceClient()
  const [{ data: inv }, { data: actions }, { data: notes }] = await Promise.all([
    db.from('investigations').select('*, alerts(*)').eq('id', id).single(),
    db.from('actions').select('*').eq('investigation_id', id).order('created_at'),
    db.from('alert_notes').select('*').eq('alert_id', (await db.from('investigations').select('alert_id').eq('id', id).single()).data?.alert_id ?? '').order('created_at'),
  ])

  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  type AlertRow = { title: string; severity: string; source_ip: string | null; dest_ip: string | null; source_host: string | null; created_at: string; tags: string[] }
  const alert = (inv as unknown as { alerts: AlertRow }).alerts

  if (format === 'json') {
    return NextResponse.json({ investigation: inv, actions, notes })
  }

  // Plain text incident report
  const lines: string[] = [
    '╔' + '═'.repeat(58) + '╗',
    '║         SOC ANALYST — INCIDENT REPORT' + ' '.repeat(19) + '║',
    '╚' + '═'.repeat(58) + '╝',
    '',
    `Generated:    ${new Date().toLocaleString()}`,
    `Report ID:    ${id}`,
    '',
    hr(),
    'ALERT DETAILS',
    hr(),
    `Title:        ${alert?.title ?? 'N/A'}`,
    `Severity:     ${alert?.severity?.toUpperCase() ?? 'N/A'}`,
    `Status:       ${(inv as unknown as { status: string }).status}`,
    `Source IP:    ${alert?.source_ip ?? 'N/A'}`,
    `Dest IP:      ${alert?.dest_ip ?? 'N/A'}`,
    `Source Host:  ${alert?.source_host ?? 'N/A'}`,
    `Detected:     ${alert?.created_at ? new Date(alert.created_at).toLocaleString() : 'N/A'}`,
    `Tags:         ${alert?.tags?.join(', ') || 'none'}`,
    '',
    hr(),
    'INVESTIGATION SUMMARY',
    hr(),
    `Confidence:   ${inv.confidence_score != null ? Math.round(Number(inv.confidence_score) * 100) + '%' : 'N/A'}`,
    `Status:       ${(inv as unknown as { status: string }).status}`,
    `Started:      ${new Date(inv.created_at).toLocaleString()}`,
    '',
    (inv as unknown as { summary: string | null }).summary ?? 'No summary available.',
    '',
  ]

  const chain = (inv as unknown as { attack_chain: string[] }).attack_chain
  if (chain?.length > 0) {
    lines.push(hr(), 'ATTACK CHAIN (MITRE ATT&CK)', hr())
    chain.forEach((step, i) => lines.push(`  ${String(i + 1).padStart(2, '0')}. ${step}`))
    lines.push('')
  }

  if (actions?.length) {
    lines.push(hr(), 'RECOMMENDED ACTIONS', hr())
    actions.forEach(a => {
      lines.push(`  [${a.status.toUpperCase().padEnd(8)}] ${a.action_type.replace(/_/g, ' ')}`)
      lines.push(`             ${a.description}`)
      if (a.result) lines.push(`             Result: ${a.result}`)
    })
    lines.push('')
  }

  const reasoning = (inv as unknown as { reasoning_chain: Array<{ step: number; thought: string; tool_used: string | null }> }).reasoning_chain
  if (reasoning?.length) {
    lines.push(hr(), 'AGENT REASONING CHAIN', hr())
    reasoning.forEach(step => {
      lines.push(`  Step ${step.step}${step.tool_used ? ` [${step.tool_used}]` : ''}`)
      const wrapped = step.thought.slice(0, 400).replace(/(.{75})/g, '$1\n          ')
      lines.push(`          ${wrapped}`)
    })
    lines.push('')
  }

  if (notes?.length) {
    lines.push(hr(), 'ANALYST NOTES', hr())
    notes.forEach(n => {
      lines.push(`  ${n.author_email}  ${new Date(n.created_at).toLocaleString()}`)
      lines.push(`  ${n.content}`)
      lines.push('')
    })
  }

  lines.push(hr(), `END OF REPORT — SOC Analyst v1.0  —  ${new Date().toISOString()}`, hr())

  const text = lines.join('\n')
  const filename = `incident-report-${id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`

  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
