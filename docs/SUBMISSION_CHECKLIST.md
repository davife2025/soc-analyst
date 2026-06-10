# Hackathon Submission Checklist

## Code
- [x] Monorepo with pnpm + Turborepo
- [x] apps/web — Next.js 14 App Router
- [x] apps/agent — Autonomous Kimi K2 investigation loop
- [x] apps/ingest — Splunk HEC pipeline
- [x] packages/db — Supabase types + migrations
- [x] packages/ai — Kimi K2 client + threat intel + playbook engine
- [x] packages/splunk — Splunk search + normalization
- [x] packages/auth — Supabase SSR + RBAC
- [x] packages/ui — Shared React components

## Features
- [x] Real-time dashboard (Supabase Realtime websocket)
- [x] Autonomous multi-step investigation with Kimi K2
- [x] Threat intel enrichment (VirusTotal + AbuseIPDB + NVD)
- [x] Splunk SPL correlation queries
- [x] MITRE ATT&CK attack chain mapping
- [x] Confidence scoring
- [x] Playbook engine (auto-execute safe, flag destructive)
- [x] Action approval workflow (human-in-the-loop)
- [x] Tamper-proof audit log
- [x] Supabase Auth + RBAC (admin/analyst/viewer)
- [x] Splunk webhook integration (token auth)
- [x] Demo data seeder (8 realistic alerts)

## Security
- [x] Rate limiting (per-IP sliding window)
- [x] CSP + security headers
- [x] Webhook token hashing (SHA-256)
- [x] Input sanitization
- [x] Role-based access control
- [x] Append-only audit log

## Testing & CI
- [x] Playwright E2E tests (auth, webhook, dashboard, playbooks)
- [x] GitHub Actions CI (type-check + lint + E2E)

## Submission Assets
- [x] README.md (architecture, quick start, demo script)
- [x] docs/VIDEO_SCRIPT.md
- [x] docs/SUBMISSION_CHECKLIST.md
- [ ] Demo video (record using VIDEO_SCRIPT.md)
- [ ] Deploy to Vercel + Render
- [ ] Seed demo data on deployed instance
- [ ] Submit on Devpost with GitHub link + video

## Splunk AI Capabilities Used
- [x] Splunk MCP Server integration (via packages/splunk)
- [x] AI agents for Splunk apps (autonomous investigation agent)
- [x] Splunk HEC event pipeline (apps/ingest)
- [x] Splunk alert webhook integration (/api/webhooks/splunk)
- [x] Splunk saved search runner (SplunkClient.search)
