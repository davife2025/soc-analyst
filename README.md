# 🛡️ SOC Analyst — Autonomous Security Operations Agent

> **Splunk Agentic Ops Hackathon** · Security Track

An AI-powered autonomous SOC analyst that investigates security alerts end-to-end — from raw Splunk event to reasoned finding, recommended action, and automated response — with zero manual triage required for routine threats.

---

## 🎯 What It Does

When a Splunk alert fires, the agent:

1. **Receives** the alert via webhook or HEC pipeline
2. **Investigates** autonomously using Kimi K2 (via Hugging Face) with multi-step tool use
3. **Enriches** with threat intelligence (VirusTotal + AbuseIPDB + NVD CVE)
4. **Correlates** via live Splunk SPL searches
5. **Reasons** through the attack chain (mapped to MITRE ATT&CK)
6. **Recommends** specific response actions with confidence scoring
7. **Triggers playbooks** — auto-executing safe actions, flagging destructive ones for analyst approval
8. **Logs everything** to a tamper-proof audit trail

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Splunk                               │
│  Alerts ──► Webhook ──► /api/webhooks/splunk                │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST (Bearer token auth)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              apps/ingest  (Render)                          │
│  Normalizes events ──► Supabase alerts table                │
└─────────────────────┬───────────────────────────────────────┘
                      │ Supabase Realtime
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              apps/agent  (Render Worker)                    │
│                                                             │
│  Poll new alerts ──► Kimi K2 (HF Inference API)            │
│       │                    │                                │
│       │              Tool calls:                            │
│       │              • lookup_threat_intel                  │
│       │                (VirusTotal + AbuseIPDB + NVD)       │
│       │              • search_splunk (SPL queries)          │
│       │              • get_host_context                     │
│       │                                                     │
│  Investigation complete ──► matchPlaybooks                  │
│       │                    ──► executePlaybook              │
│       ▼                                                     │
│  Write: investigations + actions + audit_log                │
└─────────────────────┬───────────────────────────────────────┘
                      │ Supabase Realtime (websocket)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              apps/web  (Vercel)                             │
│                                                             │
│  /dashboard      Live alerts + investigations               │
│  /investigations/[id]                                       │
│    • Reasoning chain (expandable step-by-step)             │
│    • Attack timeline (MITRE ATT&CK colored)                │
│    • Action approval panel (approve/reject)                 │
│  /playbooks      Automated response rules                   │
│  /audit          Tamper-proof decision trail                │
│  /settings       Demo seeder + quick links                  │
│  /settings/tokens  Webhook token management                 │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
              Supabase (Postgres + Realtime + Auth)
              ┌──────────────────────────────┐
              │ alerts          investigations│
              │ actions         threat_intel  │
              │ playbooks       audit_log     │
              │ profiles        webhook_tokens│
              └──────────────────────────────┘
```

---

## 🚀 Stack

| Layer | Technology |
|---|---|
| **AI Model** | Kimi K2 via Hugging Face Inference API |
| **Agent runtime** | Node.js + OpenAI-compatible SDK (tool use loop) |
| **Frontend** | Next.js 14 App Router + CSS Modules |
| **Database** | Supabase (Postgres + Realtime + Auth) |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Deployment** | Vercel (web) + Render (agent + ingest) |
| **Testing** | Playwright E2E |
| **Security** | Rate limiting, CSP headers, RBAC, hashed webhook tokens |

---

## 📦 Monorepo Structure

```
soc-analyst/
├── apps/
│   ├── web/        Next.js dashboard + API routes → Vercel
│   ├── agent/      Autonomous investigation loop → Render worker
│   └── ingest/     Splunk HEC normalizer → Render web
└── packages/
    ├── db/         Supabase client, types, all migrations
    ├── ai/         Kimi K2 client, investigation engine,
    │               threat intel, playbook engine
    ├── splunk/     Splunk search client + event normalizer
    ├── auth/       Supabase SSR auth + RBAC helpers
    ├── ui/         Shared React components
    └── config/     Shared TS/ESLint config
```

---

## ⚡ Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd soc-analyst
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in: SUPABASE_*, HUGGINGFACE_API_KEY, SPLUNK_*, WEBHOOK_SECRET

# 3. Run Supabase migrations (paste in order into Supabase SQL editor)
#    packages/db/migrations/001_initial.sql
#    packages/db/migrations/002_indexes_and_rls.sql
#    packages/db/migrations/003_auth_and_profiles.sql
#    packages/db/migrations/004_seed_tracking.sql

# 4. Start all services
pnpm dev

# 5. Seed demo data (in browser)
#    Visit /settings → click "Seed Demo Data"
```

---

## 🎬 Demo Script (Hackathon Presentation)

**Setup** (before presenting): Deploy, run migrations, set `ALLOW_SEED=true`

**Step 1 — Live Dashboard** (30s)
> "This is our autonomous SOC analyst running in production. Every alert from Splunk lands here in real time via webhook."

**Step 2 — Seed demo data** (15s)
> Go to `/settings` → Seed Demo Data → watch 8 alerts appear live on the dashboard

**Step 3 — Ransomware investigation** (60s)
> Click the "Ransomware Indicator" alert → show the investigation detail page
> "The agent investigated this autonomously — no human touched it. Here's its reasoning chain…"
> Expand reasoning steps showing threat intel lookup, Splunk correlation, confidence scoring

**Step 4 — Attack timeline** (20s)
> Scroll to attack chain: Initial Access → Execution → Persistence → Lateral Movement → Impact
> "It mapped the full MITRE ATT&CK chain — 7 stages from phishing to mass encryption"

**Step 5 — Action approval** (30s)
> Show pending actions: isolate host, block C2 IP, collect forensics
> Approve one action live — "An analyst approves the isolation. This is the human-in-the-loop."

**Step 6 — Playbooks** (20s)
> Go to `/playbooks` — show the 3 default playbooks
> "The 'Critical Alert' playbook already auto-notified the team and created a P0 ticket"

**Step 7 — Audit trail** (15s)
> Go to `/audit` — show the tamper-proof log of every agent decision
> "Every single decision is logged immutably for compliance and post-incident review"

**Step 8 — Architecture** (30s)
> Show architecture diagram, explain Kimi K2 tool-use loop
> "The agent runs on Render, the dashboard on Vercel, all state in Supabase with real-time sync"

---

## 🔒 Security Features

- **Webhook auth**: SHA-256 hashed tokens stored in DB, raw tokens shown once
- **RBAC**: admin / analyst / viewer roles via Supabase Auth
- **Rate limiting**: per-IP sliding window on all API routes (100 req/min webhooks, 10 req/min auth)
- **CSP headers**: strict Content Security Policy on all responses
- **Input sanitization**: webhook payloads sanitized before DB insertion
- **Audit log**: append-only, no delete endpoint, service-role only write

---

## 📋 Splunk Integration

### Webhook (recommended)
1. In Splunk: **Settings → Alerts → Add Action → Webhook**
2. URL: `https://your-app.vercel.app/api/webhooks/splunk`
3. Header: `Authorization: Bearer <token>` (generate at `/settings/tokens`)

### HEC (bulk ingest)
Send events to `POST https://your-ingest.onrender.com/services/collector/event`

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `alerts` | Normalized Splunk events with severity/status |
| `investigations` | Agent reasoning chains per alert |
| `actions` | Recommended + executed responses |
| `threat_intel` | Cached VirusTotal/AbuseIPDB lookups |
| `playbooks` | Automated response rule definitions |
| `audit_log` | Immutable tamper-proof decision trail |
| `profiles` | User roles (admin/analyst/viewer) |
| `webhook_tokens` | Hashed auth tokens for Splunk integration |

---

## 🧪 Testing

```bash
# E2E tests (requires TEST_USER_EMAIL + TEST_USER_PASSWORD env vars)
pnpm --filter @soc/web test:e2e

# Interactive test UI
pnpm --filter @soc/web test:e2e:ui
```

---

## 📄 Session Log

| Session | What was built |
|---|---|
| 01 | Full monorepo scaffold — all apps + packages |
| 02 | Real-time dashboard, investigation detail, threat intel, action approval |
| 03 | Supabase Auth + RBAC, Splunk webhook, playbook engine |
| 04 | Audit log viewer, webhook token manager, demo data seeder |
| 05 | Rate limiting, security hardening, Playwright E2E, CI pipeline, this README |
