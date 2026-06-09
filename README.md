# SOC Analyst – Autonomous Security Operations Agent

AI-powered SOC agent using Kimi K2 (via Hugging Face) + Splunk + Supabase.

## Monorepo Structure

```
soc-analyst/
├── apps/
│   ├── web/        → Next.js dashboard (deploy: Vercel)
│   ├── agent/      → Kimi K2 reasoning engine (deploy: Render worker)
│   └── ingest/     → Splunk HEC pipeline (deploy: Render web)
├── packages/
│   ├── db/         → Supabase client, types, migrations
│   ├── ai/         → Kimi K2 client, investigation logic
│   ├── splunk/     → Splunk search & normalization
│   ├── ui/         → Shared React components
│   └── config/     → Shared TS/ESLint config
```

## Setup

```bash
# 1. Install
pnpm install

# 2. Copy env
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HUGGINGFACE_API_KEY, SPLUNK_*

# 3. Run Supabase migration
# Paste packages/db/migrations/001_initial.sql into Supabase SQL editor

# 4. Dev
pnpm dev
```

## Deployment

- **apps/web** → Vercel (connect repo, set env vars, root dir = apps/web)
- **apps/agent** → Render (worker, use apps/agent/render.yaml)
- **apps/ingest** → Render (web service, use apps/ingest/render.yaml)

## Session Log

| Session | Description |
|---------|-------------|
| 1 | Full codebase scaffold |
