# Session 06 – Bug Fixes & Polish

## Drop-in instructions
Unzip into `soc-analyst/` root. No new dependencies. No new migrations.

---

## Fixes applied

### FIX 1 — packages/auth/src/session.ts + clients.ts + index.ts
- `cookies()` is now properly awaited (Next.js 14 requirement)
- Using `getUser()` instead of `getSession()` — more secure, validates with Supabase server
- Browser client is now a singleton (prevents re-initialization on every render)

### FIX 2 — packages/db/src/client.ts + index.ts
- Added `getEnv()` helper with clear error messages for missing vars
- `createServiceClient()` now validates env vars at call time rather than silently failing

### FIX 3 — apps/web/src/hooks/useRealtimeAlerts.ts
- Uses `createBrowserClient` (anon key) not service role client
- Accepts `initialAlerts` / `initialInvestigations` props to avoid flash of empty state
- Added channel status logging + graceful CHANNEL_ERROR handling
- Cleanup ref prevents stale subscriptions on re-render

### FIX 4 — apps/web/src/components/LiveDashboard.tsx
- Passes `initialAlerts` and `initialInvestigations` down to hooks
- No more empty flash on first load

### FIX 5 — apps/web/src/app/investigations/[id]/page.tsx + CSS
- `params` is now `Promise<{ id: string }>` and awaited (Next.js 14)
- Type casting cleaned up with proper `InvWithAlert` interface
- Added spinning "Agent is investigating" state when status is 'running'
- Added "View audit log" link in header meta
- Responsive grid (single column on mobile)

### FIX 6 — apps/web/src/components/ActionPanel.tsx
- Error display when PATCH fails
- Reverts optimistic update on failure
- Proper null check on `action.parameters`

### FIX 7 — apps/agent/src/index.ts
- Validates required env vars on startup and exits with clear message
- Exposes HTTP health check on `PORT` (required for Render worker)
- Concurrent alert processing (up to 3 at once) with `Promise.allSettled`
- Alert claiming uses conditional update (`.eq('status','new')`) to prevent double-processing
- Releases claim if investigation creation fails
- Error logged to audit_log on failure

### FIX 8 — packages/ai/src/kimi-client.ts
- Added `X-Wait-For-Model: true` header (handles HF cold starts gracefully)
- Clear error messages for 503 (model loading) and 401 (bad API key)

### FIX 9 — packages/ai/src/investigate.ts
- Retry loop (up to 2 retries) on HF 503/model-loading errors with 20s backoff
- Guards against empty response from model
- Better `parseOutput`: extracts confidence score, attack chain bullets, and action keywords
- Tool call argument parsing wrapped in try/catch

### FIX 10 — All dynamic API routes
Next.js 14 requires `params` to be `Promise<{ id: string }>` and awaited:
- apps/web/src/app/api/actions/[id]/route.ts
- apps/web/src/app/api/investigations/[id]/route.ts
- apps/web/src/app/api/playbooks/[id]/route.ts
- apps/web/src/app/api/tokens/[id]/route.ts
Also added input validation on status field in actions route.

### FIX 11 — Deployment configs
- apps/agent/render.yaml: added PORT=10000, POLL_INTERVAL_MS, correct build commands
- apps/ingest/render.yaml: corrected build path
- apps/web/vercel.json: added env var mappings
