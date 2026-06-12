# Session 11 – Full Audit & Fix Pack

## Drop-in instructions
Unzip into `soc-analyst/` root. Run `pnpm install` after (agent package.json changed).
No new migrations required.

---

## What was audited

A full cross-session review of all 10 previous sessions covering:
- Import/export chains across all packages
- Type completeness (all 10 DB tables)
- API route correctness (async params, auth, error handling)
- Component correctness (naming conflicts, null safety)
- Build configuration (turbo, pnpm workspace)
- Environment variables (complete reference)

---

## Fixes

### FIX 1 — apps/agent/package.json
Added `@soc/auth` as a dependency. The agent's notes route and heartbeat use auth helpers
that required this package but it was never declared.

### FIX 2 — packages/ai/src/index.ts
Consolidated all exports across sessions 02–07 into one definitive file.
Added missing `ReasoningStep`, `RecommendedAction` type exports.
Added `PlaybookMatch` type export from playbook-engine (not just the value).
Added `INVESTIGATION_PROMPT` export (was exported from prompts.ts but not re-exported).

### FIX 3 — packages/auth/src/index.ts
Added `createRequestClient` to exports. The S06 fix added it to session.ts but
the index.ts wasn't updated until now, so any consumer importing from `@soc/auth`
directly would get a TS error.

### FIX 4 — packages/db/src/types.ts
Definitive version including all 10 sessions' tables:
alerts, investigations, actions, threat_intel, playbooks, audit_log, profiles,
webhook_tokens, splunk_schedules, notification_channels, notification_log,
alert_notes, agent_heartbeats. Added `AgentHeartbeatStatus` type export.

### FIX 5 — apps/web/src/app/api/alerts/[id]/notes/route.ts
`getUser()` in a route handler requires the cookies context which isn't
automatically available from `@soc/auth` directly. Fixed to use
`createRequestClient()` to get an auth-aware Supabase client, then validate
the session before using the service client for the write.
File path corrected: drop into `apps/web/src/app/api/alerts/[id]/notes/route.ts`

### FIX 6 — apps/web/src/app/api/health/route.ts
Added `force-dynamic` export. Wrapped in try/catch so the route returns a safe
offline response if `agent_heartbeats` table doesn't exist (migration not run yet)
instead of crashing with a 500. Fixed the `alerts_processed_1h` type cast.

### FIX 7 — apps/web/src/components/InvestigationsList.tsx
Renamed internal `fetch_` function to `loadInvestigations` to avoid shadowing the
global `fetch` and causing confusing TypeScript errors. Used `window.fetch` explicitly
for the API call.

### FIX 8 — apps/web/src/components/AgentHealthWidget.tsx
Extracted `Metric` sub-component to reduce repetition. Initialized state with
`OFFLINE` constant instead of `null` to avoid null checks throughout. Used
`window.fetch` explicitly. Added `[...history].reverse()` to avoid mutating state.

### FIX 9 — packages/auth/src/session.ts
Confirmed final version (from S06) is correct with `createRequestClient` exported.

### FIX 10-12 — turbo.json, package.json, pnpm-workspace.yaml
`lint` task now depends on `^build` so packages are built before linting apps.
Root package.json and pnpm-workspace.yaml confirmed correct.

### FIX 13 — .env.example
Complete environment variable reference covering all 10 sessions:
Supabase, HuggingFace, Splunk, webhook, threat intel, notifications,
agent tuning, demo, and testing variables. All documented.

---

## File drop-in map

| File in this zip | Drop into repo at |
|---|---|
| apps/agent/package.json | apps/agent/package.json |
| apps/web/src/app/api/alerts/notes-route.ts | apps/web/src/app/api/alerts/[id]/notes/route.ts |
| apps/web/src/app/api/health/route.ts | apps/web/src/app/api/health/route.ts |
| apps/web/src/components/InvestigationsList.tsx | apps/web/src/components/InvestigationsList.tsx |
| apps/web/src/components/AgentHealthWidget.tsx | apps/web/src/components/AgentHealthWidget.tsx |
| packages/ai/src/index.ts | packages/ai/src/index.ts |
| packages/auth/src/index.ts | packages/auth/src/index.ts |
| packages/auth/src/session.ts | packages/auth/src/session.ts |
| packages/db/src/types.ts | packages/db/src/types.ts |
| turbo.json | turbo.json |
| package.json | package.json |
| pnpm-workspace.yaml | pnpm-workspace.yaml |
| .env.example | .env.example |

⚠️ The notes-route.ts file must be RENAMED to `route.ts` after dropping it into
`apps/web/src/app/api/alerts/[id]/notes/`.
