import type { SplunkSearchResult } from './types'

export class SplunkClient {
  private baseUrl: string
  private token: string

  constructor() {
    const host = process.env.SPLUNK_HOST!
    const port = process.env.SPLUNK_PORT ?? '8089'
    this.baseUrl = `https://${host}:${port}`
    this.token = process.env.SPLUNK_TOKEN!
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  }

  async search(query: string, timerange = '-1h'): Promise<SplunkSearchResult> {
    // Create a search job
    const jobRes = await fetch(`${this.baseUrl}/services/search/jobs`, {
      method: 'POST',
      headers: this.headers,
      body: new URLSearchParams({
        search: `search ${query}`,
        earliest_time: timerange,
        latest_time: 'now',
        output_mode: 'json',
      })
    })
    const job = await jobRes.json() as { sid: string }

    // Poll until complete
    await this.waitForJob(job.sid)

    // Fetch results
    const resRes = await fetch(
      `${this.baseUrl}/services/search/jobs/${job.sid}/results?output_mode=json&count=100`,
      { headers: this.headers }
    )
    return resRes.json() as Promise<SplunkSearchResult>
  }

  private async waitForJob(sid: string, maxWait = 30): Promise<void> {
    for (let i = 0; i < maxWait; i++) {
      await new Promise(r => setTimeout(r, 1000))
      const res = await fetch(
        `${this.baseUrl}/services/search/jobs/${sid}?output_mode=json`,
        { headers: this.headers }
      )
      const data = await res.json() as { entry: Array<{ content: { dispatchState: string } }> }
      const state = data.entry?.[0]?.content?.dispatchState
      if (state === 'DONE') return
    }
    throw new Error(`Splunk job ${sid} timed out`)
  }

  async getAlerts(): Promise<unknown[]> {
    const res = await fetch(
      `${this.baseUrl}/services/alerts/fired_alerts?output_mode=json`,
      { headers: this.headers }
    )
    const data = await res.json() as { entry: unknown[] }
    return data.entry ?? []
  }
}
