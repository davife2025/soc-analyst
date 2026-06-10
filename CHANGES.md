# Session 03 – Changed & New Files

## Drop-in instructions
Unzip into your `soc-analyst/` root. Run `pnpm install` after (new package: @soc/auth, @supabase/ssr).

## New migrations
Run in Supabase SQL editor in order:
1. `packages/db/migrations/003_auth_and_profiles.sql`

## Supabase Dashboard setup
1. Go to Authentication → Providers → Email: enable "Confirm email" + "Enable email confirmations"
2. Go to Authentication → URL Configuration → set Site URL to your Vercel domain
3. Add redirect URL: `https://your-domain.vercel.app/auth/callback`

## New env vars
```
WEBHOOK_SECRET=your-random-secret-here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...   (optional)
```

---

## New package: packages/auth
Supabase SSR auth client with server/browser clients, session helpers, `requireAuth()`, role-based access.

## New files

### apps/web/src/middleware.ts
Route protection — redirects unauthenticated users to /login.

### apps/web/src/app/(auth)/login/page.tsx + login.module.css
Login page with password + magic link tabs.

### apps/web/src/app/(auth)/callback/route.ts
OAuth/magic link callback handler.

### apps/web/src/components/LoginForm.tsx + .module.css
Client-side login form component.

### apps/web/src/components/UserMenu.tsx + .module.css
Authenticated user dropdown with role badge + sign out.

### apps/web/src/components/PlaybookCard.tsx + .module.css
Playbook viewer with activate/deactivate toggle.

### apps/web/src/app/playbooks/page.tsx + playbooks.module.css
Playbooks management page. Seeds 3 default playbooks on first load.

### apps/web/src/app/api/playbooks/[id]/route.ts
PATCH endpoint to activate/deactivate playbooks.

### apps/web/src/app/api/webhooks/splunk/route.ts
Authenticated Splunk webhook endpoint. Accepts Bearer token or X-Splunk-Webhook-Token header.

### packages/ai/src/playbook-engine.ts
Core playbook engine: condition matching, step execution, Slack notify + ticket creation stubs.

### packages/db/migrations/003_auth_and_profiles.sql
Profiles table, auto-create trigger, RLS policies, webhook_tokens table.

## Changed files

### apps/web/src/app/dashboard/page.tsx
Now calls `requireAuth()`, shows UserMenu + Playbooks nav link.

### apps/web/src/app/dashboard/dashboard.module.css
Updated header with nav.

### apps/web/package.json
Added @soc/auth, @supabase/ssr.

### packages/db/src/types.ts
Added profiles, webhook_tokens tables.

### packages/ai/src/index.ts
Exports matchPlaybooks, executePlaybook.

### apps/agent/src/index.ts
After investigation completes, runs playbook matching and auto-executes safe actions.
