# Session 02 – Changed & New Files

## Drop-in instructions
Unzip into your `soc-analyst/` root. All paths match. Existing files are replaced, new files are added. Run `pnpm install` after if any package.json changed.

## New migrations
Run in Supabase SQL editor (in order):
1. `packages/db/migrations/002_indexes_and_rls.sql`

## New env vars
Add to `.env`:
```
VIRUSTOTAL_API_KEY=your-vt-api-key
ABUSEIPDB_API_KEY=your-abuseipdb-api-key
```

---

## Changed files

### apps/web/src/app/dashboard/page.tsx
Server component now hands off to `<LiveDashboard>` client component.

### apps/web/src/app/dashboard/dashboard.module.css
Updated styles with live badge animation.

### apps/agent/src/tools.ts
Now calls real VirusTotal + AbuseIPDB APIs. Writes results to threat_intel cache.

### packages/ai/src/index.ts
Exports threat intel functions.

### packages/ai/src/types.ts
Added `ThreatIntelResult` type.

---

## New files

### apps/web/src/hooks/useRealtimeAlerts.ts
Supabase Realtime hooks for live alert + investigation updates.

### apps/web/src/components/LiveDashboard.tsx + .module.css
Client component wrapping the dashboard with live subscriptions.

### apps/web/src/components/ReasoningChain.tsx + .module.css
Expandable step-by-step agent reasoning viewer.

### apps/web/src/components/AttackTimeline.tsx + .module.css
MITRE ATT&CK colored attack chain timeline.

### apps/web/src/components/ActionPanel.tsx + .module.css
Approve/reject action UI with optimistic updates.

### apps/web/src/app/investigations/[id]/page.tsx + investigation.module.css
Full investigation detail page.

### apps/web/src/app/api/actions/[id]/route.ts
PATCH endpoint for approving/rejecting actions. Writes to audit_log.

### packages/ai/src/threat-intel.ts
VirusTotal, AbuseIPDB, NVD CVE lookup with unified score merging.

### packages/db/migrations/002_indexes_and_rls.sql
Performance indexes + RLS policies.
