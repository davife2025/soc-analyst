# Session 10 – Agent Health, Export, Final Polish

## Drop-in instructions
Unzip into `soc-analyst/` root. No new npm dependencies. Run migration 007.

## New migrations
Run in Supabase SQL editor:
1. `packages/db/migrations/007_agent_health.sql`

## New env vars (optional)
```
HEARTBEAT_INTERVAL_MS=30000    # how often agent emits heartbeat (default 30s)
AGENT_VERSION=1.0.0            # shown in health widget
```

---

## New files

### apps/agent/src/heartbeat.ts
Emits heartbeat to `agent_heartbeats` table every 30s:
- alerts_queued (new alerts in DB), alerts_processed_1h, last_investigation_at
- status: healthy / degraded (queue > 50) / error
- process PID + uptime in metadata
- Trims to 1000 most recent entries

### apps/web/src/app/api/health/route.ts
GET: returns agent online status, last seen, uptime %, queue depth, processed/hr,
totals (alerts + investigations), and last 20 heartbeats for sparkline.

### apps/web/src/components/AgentHealthWidget.tsx + .module.css
Dashboard widget showing:
- Online/offline/degraded status with pulsing dot
- Queue depth, processed/hr, uptime %, process uptime
- 20-point heartbeat sparkline (green=healthy, amber=degraded, red=error)
- Polls /api/health every 30s, shimmer skeleton while loading

### apps/web/src/app/api/export/alerts/route.ts
GET with query params (since, severity, status): streams CSV of up to 5000 alerts.
Proper escaping for fields with commas/quotes/newlines.

### apps/web/src/app/api/export/investigation/route.ts
GET ?id=&format=(txt|json):
- txt: full formatted incident report with alert details, summary, attack chain,
  actions, reasoning chain, analyst notes — ready for email/ticket attachment
- json: raw structured data for integration

### apps/web/src/components/ExportButtons.tsx + .module.css
Download buttons that trigger blob download with proper filename from
Content-Disposition header. Works for both alerts CSV and investigation reports.

## Changed files

### apps/agent/src/index.ts
Calls startHeartbeat() on startup.

### apps/web/src/app/dashboard/page.tsx + .module.css
AgentHealthWidget rendered between header and LiveDashboard.

### apps/web/src/app/investigations/[id]/page.tsx + .module.css
ExportButtons added to header meta row. Breadcrumb links back to alert detail.
Updated to session-09 investigation.module.css styles.

### README.md
Final submission README with demo video script, architecture diagram,
stack table, quick start, migration list, security features, session log.
