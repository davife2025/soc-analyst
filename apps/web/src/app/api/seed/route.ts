import { createServiceClient } from '@soc/db'
import { NextResponse } from 'next/server'

// Only allow in non-production
function isAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_SEED === 'true'
}

const DEMO_ALERTS = [
  {
    splunk_event_id: 'demo-001',
    title: 'Brute Force Login Attempt - SSH',
    severity: 'high' as const,
    status: 'new' as const,
    source_ip: '185.220.101.47',
    dest_ip: '10.0.1.15',
    source_host: 'web-prod-01',
    tags: ['brute-force', 'ssh', 'authentication'],
    raw_event: {
      _time: new Date(Date.now() - 5 * 60000).toISOString(),
      event_type: 'authentication_failure',
      attempt_count: 847,
      timespan: '10m',
      user: 'root',
      dest_port: 22,
      src_country: 'RU',
    },
  },
  {
    splunk_event_id: 'demo-002',
    title: 'Ransomware Indicator - Mass File Encryption',
    severity: 'critical' as const,
    status: 'investigating' as const,
    source_ip: '10.0.2.44',
    dest_ip: null,
    source_host: 'finance-ws-03',
    tags: ['ransomware', 'file-encryption', 'critical'],
    raw_event: {
      _time: new Date(Date.now() - 12 * 60000).toISOString(),
      event_type: 'file_modification',
      files_modified: 3247,
      file_extensions: ['.locked', '.encrypted'],
      process: 'svchost.exe',
      parent_process: 'explorer.exe',
      entropy_score: 7.9,
    },
  },
  {
    splunk_event_id: 'demo-003',
    title: 'Lateral Movement Detected - Pass-the-Hash',
    severity: 'critical' as const,
    status: 'new' as const,
    source_ip: '10.0.2.44',
    dest_ip: '10.0.1.5',
    source_host: 'finance-ws-03',
    tags: ['lateral-movement', 'pass-the-hash', 'credential-abuse'],
    raw_event: {
      _time: new Date(Date.now() - 8 * 60000).toISOString(),
      event_type: 'lateral_movement',
      technique: 'T1550.002',
      source_user: 'DOMAIN\\jsmith',
      dest_host: 'dc-01',
      logon_type: 3,
      ntlm_hash: 'aad3b435b51404eeaad3b435b51404ee',
    },
  },
  {
    splunk_event_id: 'demo-004',
    title: 'Data Exfiltration Attempt - Unusual Outbound',
    severity: 'high' as const,
    status: 'new' as const,
    source_ip: '10.0.3.22',
    dest_ip: '45.142.212.100',
    source_host: 'db-prod-02',
    tags: ['exfiltration', 'data-loss', 'dns-tunneling'],
    raw_event: {
      _time: new Date(Date.now() - 20 * 60000).toISOString(),
      event_type: 'network_anomaly',
      bytes_out: 2_450_000_000,
      dest_port: 53,
      protocol: 'DNS',
      query_count: 14500,
      avg_query_length: 220,
    },
  },
  {
    splunk_event_id: 'demo-005',
    title: 'Privilege Escalation - Suspicious Sudo',
    severity: 'medium' as const,
    status: 'new' as const,
    source_ip: '10.0.1.88',
    dest_ip: null,
    source_host: 'app-server-07',
    tags: ['privilege-escalation', 'sudo', 'linux'],
    raw_event: {
      _time: new Date(Date.now() - 35 * 60000).toISOString(),
      event_type: 'privilege_escalation',
      user: 'deploy',
      command: 'sudo bash -i',
      cwd: '/tmp/.hidden',
      tty: 'pts/1',
    },
  },
  {
    splunk_event_id: 'demo-006',
    title: 'C2 Beaconing - Known Malicious IP',
    severity: 'critical' as const,
    status: 'new' as const,
    source_ip: '10.0.2.15',
    dest_ip: '91.92.109.175',
    source_host: 'hr-laptop-12',
    tags: ['c2', 'beaconing', 'malware'],
    raw_event: {
      _time: new Date(Date.now() - 2 * 60000).toISOString(),
      event_type: 'c2_communication',
      beacon_interval: 300,
      jitter: '10%',
      user_agent: 'Mozilla/5.0 (compatible; MSIE 9.0)',
      uri_pattern: '/api/v1/telemetry',
      vt_score: '47/72',
    },
  },
  {
    splunk_event_id: 'demo-007',
    title: 'Web Application - SQLi Attempt',
    severity: 'medium' as const,
    status: 'resolved' as const,
    source_ip: '203.0.113.42',
    dest_ip: '10.0.0.10',
    source_host: 'nginx-edge-01',
    tags: ['sqli', 'web-attack', 'waf'],
    raw_event: {
      _time: new Date(Date.now() - 90 * 60000).toISOString(),
      event_type: 'web_attack',
      attack_type: 'SQL Injection',
      uri: "/search?q=' OR 1=1--",
      http_status: 403,
      waf_action: 'blocked',
      request_count: 127,
    },
  },
  {
    splunk_event_id: 'demo-008',
    title: 'Credential Stuffing - Auth API',
    severity: 'high' as const,
    status: 'new' as const,
    source_ip: '45.155.205.233',
    dest_ip: '10.0.0.10',
    source_host: 'api-gateway-01',
    tags: ['credential-stuffing', 'authentication', 'api'],
    raw_event: {
      _time: new Date(Date.now() - 15 * 60000).toISOString(),
      event_type: 'credential_stuffing',
      requests_per_minute: 1840,
      unique_usernames: 923,
      success_rate: '0.3%',
      source_asn: 'AS209588',
    },
  },
]

const DEMO_INVESTIGATIONS = [
  {
    status: 'complete' as const,
    summary: 'High-confidence ransomware incident on finance-ws-03. The process svchost.exe (spawned by explorer.exe) began encrypting files at 14:23 UTC. Entropy score of 7.9 indicates active encryption. Files targeted include .docx, .xlsx, .pdf across shared drives. Lateral movement to DC detected 4 minutes later via pass-the-hash. Immediate isolation recommended.',
    confidence_score: 0.94,
    attack_chain: [
      'Initial Access: Phishing email with malicious macro (T1566.001)',
      'Execution: Malicious Office macro spawns svchost.exe (T1204.002)',
      'Persistence: Registry run key added (T1547.001)',
      'Defense Evasion: Process injection into svchost.exe (T1055)',
      'Credential Access: LSASS dump for credential harvesting (T1003.001)',
      'Lateral Movement: Pass-the-Hash to Domain Controller (T1550.002)',
      'Impact: Mass file encryption with .locked extension (T1486)',
    ],
    agent_version: '1.0.0',
    reasoning_chain: [
      { step: 1, thought: 'Analyzing alert: mass file encryption with entropy score 7.9. This is a strong indicator of ransomware activity.', tool_used: null, tool_result: null, timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
      { step: 2, thought: 'Looking up source IP 10.0.2.44 in threat intel...', tool_used: 'lookup_threat_intel', tool_result: { cached: false, threat_score: 0.0, source: 'internal', details: { note: 'Internal IP' } }, timestamp: new Date(Date.now() - 9 * 60000).toISOString() },
      { step: 3, thought: 'Internal IP. Searching for related events from this host in the last hour...', tool_used: 'search_splunk', tool_result: { success: true, count: 23, results: [] }, timestamp: new Date(Date.now() - 8 * 60000).toISOString() },
      { step: 4, thought: 'Found 23 correlated events. Notable: authentication failure followed by successful login 8 minutes before encryption started. Also seeing DNS queries to known C2 domain.', tool_used: 'get_host_context', tool_result: { hostname: 'finance-ws-03', event_count_24h: 847 }, timestamp: new Date(Date.now() - 7 * 60000).toISOString() },
      { step: 5, thought: 'Correlating with lateral movement alert demo-003 — same source host, same timeframe. This is a coordinated attack. Confidence: 94%.', tool_used: null, tool_result: null, timestamp: new Date(Date.now() - 6 * 60000).toISOString() },
    ],
  },
]

export async function POST(req: Request) {
  if (!isAllowed()) {
    return NextResponse.json({ error: 'Seeding not allowed in production' }, { status: 403 })
  }

  // Optional secret check for extra safety
  const { secret } = await req.json().catch(() => ({})) as { secret?: string }
  if (process.env.SEED_SECRET && secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Invalid seed secret' }, { status: 403 })
  }

  const db = createServiceClient()
  const results = { alerts: 0, investigations: 0, actions: 0 }

  // Seed alerts
  for (const alert of DEMO_ALERTS) {
    const { data } = await db
      .from('alerts')
      .upsert(alert, { onConflict: 'splunk_event_id', ignoreDuplicates: true })
      .select('id')
      .single()
    if (data) results.alerts++
  }

  // Seed one full investigation for the ransomware alert
  const { data: ransomAlert } = await db
    .from('alerts')
    .select('id')
    .eq('splunk_event_id', 'demo-002')
    .single()

  if (ransomAlert) {
    const invData = DEMO_INVESTIGATIONS[0]

    const { data: inv } = await db
      .from('investigations')
      .insert({ ...invData, alert_id: ransomAlert.id })
      .select('id')
      .single()

    if (inv) {
      results.investigations++

      // Seed actions for this investigation
      const demoActions = [
        { investigation_id: inv.id, action_type: 'isolate_host', description: 'Isolate finance-ws-03 from network immediately to contain ransomware spread', parameters: { hostname: 'finance-ws-03', reason: 'Active ransomware encryption detected' }, status: 'pending' as const },
        { investigation_id: inv.id, action_type: 'notify_team', description: 'Alert IR team: ransomware incident on finance-ws-03 + lateral movement to DC', parameters: { message: '🚨 CRITICAL: Active ransomware on finance-ws-03. Lateral movement to DC detected. Immediate response required.', channel: '#incident-response' }, status: 'approved' as const },
        { investigation_id: inv.id, action_type: 'create_ticket', description: 'Create P0 incident ticket for ransomware response', parameters: { title: 'P0: Active Ransomware - finance-ws-03', priority: 'critical', assignee: 'ir-team' }, status: 'executed' as const, result: 'Ticket INC-2847 created' },
        { investigation_id: inv.id, action_type: 'block_ip', description: 'Block C2 IP 91.92.109.175 at perimeter firewall', parameters: { ip: '91.92.109.175', direction: 'egress', duration: 'permanent' }, status: 'pending' as const },
        { investigation_id: inv.id, action_type: 'collect_forensics', description: 'Collect memory dump and disk image from finance-ws-03 before isolation', parameters: { hostname: 'finance-ws-03', type: 'full' }, status: 'pending' as const },
      ]

      for (const action of demoActions) {
        await db.from('actions').insert(action)
        results.actions++
      }

      // Update alert status to investigating
      await db.from('alerts').update({ status: 'investigating' }).eq('id', ransomAlert.id)
    }
  }

  return NextResponse.json({
    message: 'Demo data seeded successfully',
    seeded: results,
  })
}

export async function DELETE() {
  if (!isAllowed()) {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  const db = createServiceClient()
  const eventIds = DEMO_ALERTS.map(a => a.splunk_event_id)

  const { data: alerts } = await db.from('alerts').select('id').in('splunk_event_id', eventIds)
  const alertIds = alerts?.map(a => a.id) ?? []

  if (alertIds.length) {
    const { data: invs } = await db.from('investigations').select('id').in('alert_id', alertIds)
    const invIds = invs?.map(i => i.id) ?? []
    if (invIds.length) await db.from('actions').delete().in('investigation_id', invIds)
    await db.from('investigations').delete().in('alert_id', alertIds)
    await db.from('alerts').delete().in('id', alertIds)
  }

  return NextResponse.json({ message: 'Demo data cleared' })
}
