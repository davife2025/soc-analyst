# Session 04 – Changed & New Files

## Drop-in instructions
Unzip into your `soc-analyst/` root. No new dependencies — `pnpm install` not required.

## New migrations (optional)
Run in Supabase SQL editor:
1. `packages/db/migrations/004_seed_tracking.sql`

## New env vars
Add to `.env`:
```
ALLOW_SEED=true          # enables /api/seed on this environment
SEED_SECRET=any-string   # optional extra protection for the seed endpoint
```

---

## New files

### apps/web/src/app/audit/page.tsx + audit.module.css
Paginated audit log viewer with entity-type filters (all / alert / investigation / action / playbook / token).

### apps/web/src/components/AuditTable.tsx + .module.css
Expandable audit log table — click any row to see full entity ID, metadata, and result payload.

### apps/web/src/app/settings/tokens/page.tsx + tokens.module.css
Webhook token management page (admin only). Shows webhook URL + header instructions.

### apps/web/src/components/TokenManager.tsx + .module.css
Generate / revoke webhook tokens. Raw token shown once with one-click copy. Hashed before storage.

### apps/web/src/app/api/tokens/route.ts
POST: generate a new token (sha256-hashed, raw returned once). Writes to audit_log.

### apps/web/src/app/api/tokens/[id]/route.ts
DELETE: revoke a token (sets active=false). Writes to audit_log.

### apps/web/src/app/api/seed/route.ts
POST: seeds 8 realistic demo alerts + 1 full ransomware investigation with reasoning chain + 5 actions.
DELETE: clears all seeded demo data.
Blocked in production unless ALLOW_SEED=true.

### apps/web/src/components/SeedPanel.tsx + .module.css
One-click seed / clear UI for the settings page.

### apps/web/src/app/settings/page.tsx + settings.module.css
Settings hub with Developer Tools (seed panel) + quick links to audit, tokens, playbooks.

### packages/db/migrations/004_seed_tracking.sql
Optional seed_runs table for tracking demo data loads.

## Changed files

### apps/web/src/app/dashboard/page.tsx
Nav updated: added Audit, Settings, Tokens (admin only) links.

### apps/web/src/app/dashboard/dashboard.module.css
Minor nav spacing tweak.

### .env.example
Added ALLOW_SEED and SEED_SECRET vars.

---

## Hackathon demo flow
1. Deploy to Vercel (web) + Render (agent + ingest)
2. Run all 4 migrations in Supabase SQL editor
3. Set ALLOW_SEED=true in Vercel env vars
4. Visit /settings → click "Seed Demo Data"
5. Watch /dashboard — 8 alerts appear live
6. Click the ransomware investigation — full reasoning chain, attack timeline, pending actions
7. Approve/reject actions live on screen
8. Visit /audit to show the tamper-proof trail
9. Visit /playbooks to show automated response rules
