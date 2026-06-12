# 🛡️ SOC Analyst — Autonomous Security Operations Agent

> **Splunk Agentic Ops Hackathon** · Security Track · 10-session build

An AI-powered SOC analyst that investigates Splunk alerts end-to-end — from raw event to reasoned finding, MITRE ATT&CK mapping, automated playbook execution, and analyst-approved response — with full audit trail and real-time collaboration.

---

## 🎬 Demo Video Script

**Setup**: Deploy → run migrations → seed demo data → open /dashboard

**[0:00–0:20] Hook**
> "Every second your Splunk fires alerts. Your team manually triages each one — 20–40 minutes each. SOC Analyst does it autonomously in under 30 seconds."

**[0:20–0:50] Live dashboard**
> Go to /settings → Seed Demo Data → watch 8 realistic alerts appear live

**[0:50–1:30] Ransomware investigation**
> Click the "Mass File Encryption" alert → alert detail page → click investigation link
> Show reasoning chain expanding step by step — threat intel lookup, Splunk correlation, lateral movement correlation
> "94% confidence. It mapped 7 MITRE ATT&CK stages autonomously."

**[1:30–2:00] Attack timeline + actions**
> Show attack chain: Initial Access → Execution → Lateral Movement → Impact
> Approve `isolate_host` action live → "Human in the loop for destructive actions"

**[2:00–2:20] Agent health widget**
> Point to health widget: online, queue depth, processed/hr, sparkline heartbeat

**[2:20–2:40] Export**
> Click ⬇ Report (.txt) → show incident report with full investigation detail

**[2:40–3:00] Playbooks + Audit**
> /playbooks → 3 default playbooks, auto vs manual badges
> /audit → tamper-proof log of every agent decision

**[3:00–3:20] Architecture close**
> "Kimi K2 via Hugging Face Inference API. Supabase Realtime. Next.js on Vercel. Agent worker on Render. pnpm monorepo."

---

## 🏗️ Architecture

```
Splunk ──webhook──► /api/webhooks/splunk ──► Supabase alerts table
                                                     │
                              Supabase Realtime ◄────┘
                                     │
                          apps/agent (Render worker)
                          ┌──────────────────────────┐
                          │  Poll new alerts          │
                          │  Kimi K2 tool-use loop    │
                          │  ├─ lookup_threat_intel   │
                          │  │  (VirusTotal+AbuseIPDB)│
                          │  ├─ search_splunk (SPL)   │
                          │  └─ get_host_context      │
                          │  Match + run playbooks    │
                          │  Notify channels          │
                          │  Emit heartbeat           │
                          └──────────────────────────┘
                                     │
                          apps/web (Vercel)
                          /dashboard       Live alerts + agent health
                          /alerts/[id]     Raw event, status, notes
                          /investigations  Search + filter
                          /investigations/[id]  Reasoning + actions + export
                          /analytics       KPIs, MTTR, trends
                          /playbooks       Response automation
                          /audit           Tamper-proof trail
                          /settings/*      Notifications, schedules, tokens
```

---

## 📦 Stack

| | |
|---|---|
| **AI** | Kimi K2 via Hugging Face Inference API (OpenAI-compatible) |
| **Agent** | Node.js + multi-step tool-use loop with retry |
| **Frontend** | Next.js 14 App Router + CSS Modules |
| **Database** | Supabase (Postgres + Realtime + Auth) |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Deploy** | Vercel (web) + Render (agent + ingest) |
| **Notifications** | Slack blocks + PagerDuty Events v2 + Resend email |
| **Threat intel** | VirusTotal + AbuseIPDB + NVD CVE |
| **Testing** | Playwright E2E + GitHub Actions CI |

---

## ⚡ Quick Start

```bash
pnpm install
cp .env.example .env   # fill in Supabase + HuggingFace + Splunk keys

# Run all 7 migrations in Supabase SQL editor (in order)
# packages/db/migrations/001_initial.sql … 007_agent_health.sql

pnpm dev               # starts web (3000) + agent + ingest concurrently

# Seed demo data: visit /settings → "Seed Demo Data"
```

---

## 🗄️ Migrations (run in order)

| File | What it creates |
|---|---|
| 001_initial.sql | alerts, investigations, actions, threat_intel, playbooks, audit_log |
| 002_indexes_and_rls.sql | Performance indexes + RLS policies |
| 003_auth_and_profiles.sql | profiles, webhook_tokens, auth triggers |
| 004_seed_tracking.sql | seed_runs (optional) |
| 005_analytics_and_scheduler.sql | splunk_schedules, notification_channels, notification_log |
| 006_alert_notes.sql | alert_notes with realtime |
| 007_agent_health.sql | agent_heartbeats with realtime |

---

## 🔒 Security

- Webhook tokens: SHA-256 hashed, raw shown once, append-only audit on revoke
- RBAC: admin / analyst / viewer via Supabase Auth (magic link + password)
- Rate limiting: per-IP sliding window (100/min webhooks, 10/min auth)
- CSP + HSTS + X-Frame-Options on every response
- Input sanitization on all webhook payloads
- Service role client never exposed to browser

---

## 🧪 Testing

```bash
pnpm --filter @soc/web test:e2e        # Playwright (requires TEST_USER_*)
pnpm --filter @soc/web test:e2e:ui     # Interactive Playwright UI
```

---

## 📋 Session Build Log

| Session | Built |
|---|---|
| 01 | Full monorepo scaffold |
| 02 | Realtime dashboard, investigation detail, threat intel, action approval |
| 03 | Auth + RBAC, Splunk webhook, playbook engine |
| 04 | Audit log, webhook token manager, demo seeder |
| 05 | Rate limiting, security hardening, Playwright E2E, CI |
| 06 | 11 production bug fixes (Next.js 14, auth, agent concurrency) |
| 07 | Splunk scheduler, Slack/PagerDuty/Email notifications, analytics, mobile UI |
| 08 | Notification channels UI, schedule manager, investigation search/filter |
| 09 | Alert detail page, raw event viewer, analyst notes (realtime) |
| 10 | Agent health monitor, CSV/report export, final polish |
