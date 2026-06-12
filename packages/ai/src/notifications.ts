import type { createServiceClient } from '@soc/db'
import type { Database } from '@soc/db'

type Alert = Database['public']['Tables']['alerts']['Row']
type Investigation = Database['public']['Tables']['investigations']['Row']
type Channel = Database['public']['Tables']['notification_channels']['Row']

export interface NotificationPayload {
  alert: Alert
  investigation?: Investigation | null
  message?: string
}

// ── Slack ────────────────────────────────────────────────────────
async function sendSlack(channel: Channel, payload: NotificationPayload): Promise<void> {
  const { webhook_url } = channel.config as { webhook_url: string }
  if (!webhook_url) throw new Error('Slack channel missing webhook_url in config')

  const { alert, investigation } = payload
  const severityEmoji: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪'
  }

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${severityEmoji[alert.severity] ?? '🔴'} ${alert.title}` }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Severity:*\n${alert.severity.toUpperCase()}` },
        { type: 'mrkdwn', text: `*Status:*\n${alert.status}` },
        ...(alert.source_ip ? [{ type: 'mrkdwn', text: `*Source IP:*\n${alert.source_ip}` }] : []),
        ...(investigation?.confidence_score != null
          ? [{ type: 'mrkdwn', text: `*Confidence:*\n${Math.round(Number(investigation.confidence_score) * 100)}%` }]
          : []),
      ]
    },
    ...(investigation?.summary ? [{
      type: 'section',
      text: { type: 'mrkdwn', text: `*Summary:*\n${investigation.summary.slice(0, 300)}${investigation.summary.length > 300 ? '…' : ''}` }
    }] : []),
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View Investigation' },
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/investigations/${investigation?.id ?? ''}`,
        style: 'primary'
      }]
    }
  ]

  const res = await fetch(webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks, text: `SOC Alert: ${alert.title}` })
  })

  if (!res.ok) throw new Error(`Slack returned ${res.status}: ${await res.text()}`)
}

// ── PagerDuty ────────────────────────────────────────────────────
async function sendPagerDuty(channel: Channel, payload: NotificationPayload): Promise<void> {
  const { routing_key } = channel.config as { routing_key: string }
  if (!routing_key) throw new Error('PagerDuty channel missing routing_key in config')

  const { alert, investigation } = payload
  const urgency = alert.severity === 'critical' || alert.severity === 'high' ? 'high' : 'low'

  const event = {
    routing_key,
    event_action: 'trigger',
    dedup_key: alert.id,
    payload: {
      summary: alert.title,
      severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'error' : 'warning',
      source: alert.source_host ?? alert.source_ip ?? 'unknown',
      timestamp: alert.created_at,
      custom_details: {
        source_ip: alert.source_ip,
        dest_ip: alert.dest_ip,
        confidence: investigation?.confidence_score,
        summary: investigation?.summary?.slice(0, 1000),
        tags: alert.tags,
      }
    },
    links: investigation ? [{
      href: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/investigations/${investigation.id}`,
      text: 'View Investigation'
    }] : [],
    client: 'SOC Analyst',
  }

  const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  })

  if (!res.ok) throw new Error(`PagerDuty returned ${res.status}: ${await res.text()}`)
}

// ── Email (via Resend API) ───────────────────────────────────────
async function sendEmail(channel: Channel, payload: NotificationPayload): Promise<void> {
  const { to, from } = channel.config as { to: string; from?: string }
  if (!to) throw new Error('Email channel missing "to" in config')

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const { alert, investigation } = payload
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e293b;color:#e2e8f0;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">🛡️ SOC Analyst Alert</h2>
      </div>
      <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <h3 style="margin:0 0 16px;color:#0f172a">${alert.title}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr>
            <td style="padding:6px;background:#f1f5f9;font-weight:600;width:120px">Severity</td>
            <td style="padding:6px">${alert.severity.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:6px;background:#f1f5f9;font-weight:600">Source IP</td>
            <td style="padding:6px">${alert.source_ip ?? 'N/A'}</td>
          </tr>
          ${investigation?.confidence_score != null ? `
          <tr>
            <td style="padding:6px;background:#f1f5f9;font-weight:600">Confidence</td>
            <td style="padding:6px">${Math.round(Number(investigation.confidence_score) * 100)}%</td>
          </tr>` : ''}
        </table>
        ${investigation?.summary ? `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-bottom:16px">
          <strong>Summary:</strong><br/>${investigation.summary.slice(0, 500)}
        </div>` : ''}
        ${investigation ? `
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/investigations/${investigation.id}"
          style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          View Investigation →
        </a>` : ''}
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: from ?? 'SOC Analyst <alerts@yourdomain.com>',
      to: [to],
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html,
    })
  })

  if (!res.ok) throw new Error(`Resend returned ${res.status}: ${await res.text()}`)
}

// ── Unified send function ────────────────────────────────────────
export async function sendNotification(
  channel: Channel,
  payload: NotificationPayload,
  db: ReturnType<typeof createServiceClient>
): Promise<void> {
  let status: 'sent' | 'failed' = 'sent'
  let error: string | undefined

  try {
    if (channel.type === 'slack')      await sendSlack(channel, payload)
    else if (channel.type === 'pagerduty') await sendPagerDuty(channel, payload)
    else if (channel.type === 'email') await sendEmail(channel, payload)
    else throw new Error(`Unknown channel type: ${channel.type}`)
  } catch (err) {
    status = 'failed'
    error = String(err)
    console.error(`[notify] ${channel.type} failed:`, error)
  }

  await db.from('notification_log').insert({
    channel_id: channel.id,
    channel_type: channel.type,
    alert_id: payload.alert.id,
    investigation_id: payload.investigation?.id ?? null,
    status,
    payload: { title: payload.alert.title, severity: payload.alert.severity },
    error: error ?? null,
  })

  if (status === 'failed') throw new Error(error)
}

// ── Notify all active channels matching severity threshold ────────
export async function notifyAllChannels(
  payload: NotificationPayload,
  db: ReturnType<typeof createServiceClient>
): Promise<{ sent: number; failed: number }> {
  const { data: channels } = await db
    .from('notification_channels')
    .select('*')
    .eq('active', true)

  if (!channels?.length) return { sent: 0, failed: 0 }

  let sent = 0; let failed = 0
  await Promise.allSettled(
    channels.map(async ch => {
      try { await sendNotification(ch, payload, db); sent++ }
      catch { failed++ }
    })
  )
  return { sent, failed }
}
