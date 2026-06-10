# Session 05 – Changed & New Files (Final)

## Drop-in instructions
Unzip into `soc-analyst/` root. Run `pnpm install` (new dev dep: @playwright/test).

## No new migrations required.

## New env vars
None required. Optional for CI:
```
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=test-password
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

---

## New files

### apps/web/src/lib/rate-limit.ts
Sliding window rate limiter. Presets: webhook (100/min), api (200/min), auth (10/min), seed (5/hr), actions (50/min).

### apps/web/src/lib/security-headers.ts
Security header helpers: CSP, X-Frame-Options, HSTS etc. Used in middleware + Next.js config.

### apps/web/src/middleware.ts  ← REPLACES session-03 version
Full hardening: rate limiting by route type, security headers on every response, 401 JSON for unauthenticated API calls.

### apps/web/next.config.ts  ← REPLACES session-01 version
Added security headers (HSTS, X-Content-Type-Options etc.), poweredByHeader: false.

### apps/web/playwright.config.ts
Playwright config — chromium only, HTML + list reporters, CI retries.

### apps/web/e2e/auth.spec.ts
Auth flow tests: redirect, login page render, tab switching, invalid credentials.

### apps/web/e2e/webhook.spec.ts
Webhook security tests: no token → 401, invalid → 403, valid → 200, bulk array.

### apps/web/e2e/dashboard.spec.ts
Dashboard tests (requires TEST_USER_EMAIL/PASSWORD): nav, stats, navigation, seed flow.

### apps/web/e2e/playbooks.spec.ts
Playbooks tests: default playbooks visible, step counts, trigger conditions.

### apps/web/src/app/api/webhooks/splunk/route.ts  ← REPLACES session-03 version
Added input sanitization (max key/value lengths), rate limiting, bulk event capping at 100.

### apps/web/src/app/api/actions/route.ts  ← NEW
GET endpoint for fetching actions by investigation_id or status.

### .github/workflows/ci.yml
GitHub Actions: type-check + lint + Playwright E2E on push/PR to main.

### README.md  ← REPLACES root README
Full hackathon submission README: architecture ASCII diagram, stack table, quick start, 8-step demo script, security features, Splunk integration guide, DB schema.

### docs/VIDEO_SCRIPT.md
Shot-by-shot 3:30 video script with narration, visuals, and recording notes.

### docs/SUBMISSION_CHECKLIST.md
Complete submission checklist — code, features, security, testing, assets.

## Changed files

### apps/web/package.json
Added @playwright/test devDependency + test:e2e scripts.
