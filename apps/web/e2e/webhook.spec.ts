import { test, expect } from '@playwright/test'

const WEBHOOK_URL = '/api/webhooks/splunk'

test.describe('Webhook endpoint security', () => {
  test('rejects requests with no token', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, { data: { host: 'test' } })
    expect(res.status()).toBe(401)
  })

  test('rejects requests with invalid token', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'Authorization': 'Bearer invalid-token-xyz' },
      data: { host: 'test' },
    })
    expect(res.status()).toBe(403)
  })

  test('accepts requests with valid static token', async ({ request }) => {
    const secret = process.env.WEBHOOK_SECRET ?? 'test-secret'
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'Authorization': `Bearer ${secret}` },
      data: {
        _time: new Date().toISOString(),
        host: 'test-host',
        source: 'test',
        sourcetype: 'syslog',
        severity: 'high',
        _raw: 'test event',
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('ingested')
  })

  test('handles bulk event array', async ({ request }) => {
    const secret = process.env.WEBHOOK_SECRET ?? 'test-secret'
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'Authorization': `Bearer ${secret}` },
      data: [
        { _time: new Date().toISOString(), host: 'bulk-host-1', source: 'test', sourcetype: 'syslog', _raw: 'event 1', severity: 'low', _cd: `bulk-e2e-1-${Date.now()}` },
        { _time: new Date().toISOString(), host: 'bulk-host-2', source: 'test', sourcetype: 'syslog', _raw: 'event 2', severity: 'medium', _cd: `bulk-e2e-2-${Date.now()}` },
      ],
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ingested).toBeGreaterThanOrEqual(0)
  })
})
