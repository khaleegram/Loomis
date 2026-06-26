# Deploy Loomis to [loomis.digital](https://www.loomis.digital/)

Production layout:

| Service | Host | Notes |
|---------|------|--------|
| **Web** (Next.js) | Vercel → `www.loomis.digital` | Already deployed |
| **API** (Fastify) | Railway → `api.loomis.digital` | This guide |
| **Postgres** | Railway Postgres | Main + audit DB |
| **Redis** | Railway Redis or [Upstash](https://upstash.com/) | Sessions, idempotency |
| **Files** | AWS S3 | Pre-signed uploads (existing bucket) |

The browser talks to **two** origins:

- `https://www.loomis.digital` — pages + BFF auth (`/api/auth/*`)
- `https://api.loomis.digital` — REST API (`/api/v1/*`)

Auth cookies stay on the web domain. The access token is held in memory; refresh uses httpOnly cookies via the BFF.

---

## 1. Vercel (web) — environment variables

In the Vercel project for `apps/web`, set:

| Variable | Value |
|----------|--------|
| `LOOMIS_API_BASE_URL` | `https://api.loomis.digital/api/v1` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.loomis.digital/api/v1` |
| `WEB_APP_BASE_URL` | `https://www.loomis.digital` |
| `NODE_ENV` | `production` |

Optional (when ready): `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.

**Web push (parent absence alerts):** generate VAPID keys and set on **Railway API** (required for browser push — not optional if you want alerts):

```bash
npx web-push generate-vapid-keys
```

| Variable | Where |
|----------|--------|
| `WEB_PUSH_VAPID_PUBLIC_KEY` | Railway API |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Railway API |
| `WEB_PUSH_VAPID_SUBJECT` | Railway API — e.g. `mailto:support@loomis.digital` |
| `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` | Vercel (optional; API also serves `/comms/push/config`) |

Parents enable alerts via **Enable** on the parent portal banner or **Contact → Notifications**. A browser checkbox alone does not register push; the app must save a push subscription to the API. HTTPS + service worker (`/sw.js`) is enough on desktop/Android — full PWA install is only required on **iOS Safari** (Add to Home Screen).

**Redeploy** after saving env vars (Deployments → … → Redeploy).

`apps/web/vercel.json` is included for monorepo install/build from the repo root.

---

## 2. Railway (API + Postgres + Redis)

### 2.1 Create project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** (this repo).
2. Railway reads `railway.toml` and builds `apps/api/Dockerfile`.

### 2.2 Add databases

In the same Railway project:

1. **+ New** → **Database** → **PostgreSQL**
2. **+ New** → **Database** → **Redis** (or add Upstash and paste `REDIS_URL`)

### 2.3 Audit database

The API needs a second database (`DATABASE_AUDIT_URL`). On Railway Postgres:

```sql
CREATE DATABASE loomis_audit;
```

Then apply the audit schema (from your machine, using Railway’s public connection string):

```bash
psql "$DATABASE_URL" -c "CREATE DATABASE loomis_audit;"
psql "$AUDIT_DATABASE_URL" -f scripts/audit-schema.sql
```

Set `DATABASE_AUDIT_URL` to the `loomis_audit` connection string (same host/user, different database name).

### 2.4 API service variables

On the **API service** (not the DB plugins), set:

**Required**

| Variable | Example / notes |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway reference) |
| `DATABASE_AUDIT_URL` | `postgresql://…/loomis_audit` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` or Upstash `rediss://…` |
| `JWT_PRIVATE_KEY` | RSA PEM (see §4) |
| `JWT_PUBLIC_KEY` | RSA PEM |
| `REFRESH_TOKEN_HMAC_SECRET` | `openssl rand -hex 32` |
| `REFERRAL_CODE_HMAC_SECRET` | `openssl rand -hex 32` |
| `TOTP_ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `S3_BUCKET` | Your bucket name |
| `S3_REGION` | e.g. `eu-north-1` |
| `AWS_ACCESS_KEY_ID` | IAM user for S3/SES |
| `AWS_SECRET_ACCESS_KEY` | |
| `WEB_APP_BASE_URL` | `https://www.loomis.digital` |
| `PUBLIC_SITE_APEX_DOMAIN` | `loomis.digital` (school sites at `{slug}.loomis.digital`) |
| `PUBLIC_SITE_URL_MODE` | `subdomain` (use `path` only if wildcard DNS is unavailable) |
| `PUBLIC_SITE_BASE_URL` | `https://www.loomis.digital` (path-mode fallback) |

**Recommended**

| Variable | Value |
|----------|--------|
| `PAYMENT_REDIRECT_BASE_URL` | `https://www.loomis.digital/payments/complete` |
| `PAYSTACK_SECRET_KEY` | Paystack live/test secret |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook secret |
| `RESEND_API_KEY` | From [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | `noreply@loomis.digital` (domain verified in Resend) |

Railway sets `PORT` automatically; the API uses it when `API_PORT` is unset.

### 2.5 Custom domain for API

1. API service → **Settings** → **Networking** → **Custom Domain** → `api.loomis.digital`  
   (or CLI: `cd apps/api && railway domain api.loomis.digital`)
2. At your DNS provider (where `loomis.digital` is managed), add the records Railway shows. Example:

| Type | Name | Value |
|------|------|--------|
| CNAME | `api` | `nnye6l6v.up.railway.app` |
| TXT | `_railway-verify.api` | `railway-verify=…` (copy from Railway dashboard) |

3. Wait for Railway **Verified: yes** and TLS (usually minutes; DNS can take up to 72h).
4. On **Vercel**, set `LOOMIS_API_CUSTOM_DOMAIN_READY=true` and redeploy so the web app uses `api.loomis.digital` instead of the Railway fallback URL.

**Until DNS is live:** the web app automatically uses `https://loomis-api-production.up.railway.app/api/v1` when env vars point at `api.loomis.digital` and `LOOMIS_API_CUSTOM_DOMAIN_READY` is unset. No Vercel change required for the interim fix.

### 2.5b School website subdomains (`{slug}.loomis.digital`)

Public school sites are served on per-school subdomains by the Next.js web app
(Vercel), e.g. `https://grace-academy-lagos.loomis.digital`.

**Vercel**

1. Project → **Settings → Domains** → add a **wildcard domain**: `*.loomis.digital`.
2. Add these env vars (Production):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_PUBLIC_SITE_APEX_DOMAIN` | `loomis.digital` |
| `NEXT_PUBLIC_PUBLIC_SITE_URL_MODE` | `subdomain` |
| `NEXT_PUBLIC_PUBLIC_SITE_BASE_URL` | `https://www.loomis.digital` |

**DNS** (at the `loomis.digital` registrar)

| Type | Name | Value |
|------|------|--------|
| CNAME | `*` | `cname.vercel-dns.com` (value Vercel shows for the wildcard) |

Notes:
- TLS for `*.loomis.digital` is issued automatically by Vercel once the wildcard
  domain verifies.
- The session cookie is host-only (no `Domain` attribute), so auth never leaks to
  school subdomains — public sites stay fully unauthenticated.
- `api`, `www`, `app`, and other reserved labels are never treated as schools
  (see `RESERVED_SUBDOMAINS` in `packages/core/src/public-site.ts`).
- No wildcard DNS yet? Set `PUBLIC_SITE_URL_MODE=path` (API) and
  `NEXT_PUBLIC_PUBLIC_SITE_URL_MODE=path` (web) to fall back to
  `https://www.loomis.digital/s/{slug}` until DNS is ready.

### 2.6 Run migrations

**Option A — Railway one-off command** (API service → Settings → Deploy → Custom start / or use CLI):

From your PC (after `railway login` and `railway link` → **loomis-api** service):

```powershell
cd apps/api
railway run pnpm db:migrate:prod
railway run pnpm db:seed:rich:prod
```

Run **from `apps/api`** — `db:migrate:prod` is not defined at the repo root. Use `db:seed:rich:prod` (not `db:seed:rich`), because the local seed script loads `.env.local` and will try `*.railway.internal` hostnames that do not resolve on your machine.

**Option B — Local against prod** (careful): use the Postgres **public** URL from Railway → loomis-db → **Connect** → **Public network** (host ends in `.proxy.rlwy.net`). Do **not** use `*.railway.internal` from your PC — that hostname only works inside Railway.

```powershell
cd apps/api
# Paste the PUBLIC url from Railway (not loomis-db.railway.internal)
$env:DATABASE_URL="postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway"
$env:DATABASE_AUDIT_URL=$env:DATABASE_URL
pnpm db:migrate:prod
pnpm db:seed:rich:prod
```

`db:seed:rich:prod` loads `.env.railway.local` for JWT/Redis/S3. Shell `DATABASE_URL` overrides the internal hostname in that file.

### 2.7 Seed demo data (optional)

```powershell
cd apps/api
railway run pnpm db:seed:rich:prod
```

Use only for staging/demo; change all passwords before real schools onboard.

---

## 3. DNS summary

| Record | Type | Target |
|--------|------|--------|
| `www` | CNAME | Vercel (already set) |
| `api` | CNAME | Railway API service |

Keep apex (`loomis.digital`) redirecting to `www` if that’s your marketing setup.

---

## 4. Generate JWT keys

```bash
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
```

For Railway/Vercel, paste PEM contents into env vars. Use literal `\n` for newlines if the UI requires a single line:

```
-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----
```

---

## 5. Paystack webhooks

In Paystack Dashboard → Settings → Webhooks:

```
https://api.loomis.digital/api/v1/webhooks/paystack
```

Use a **live** tunnel only after API is up. Test with Paystack’s “Send test webhook”.

---

## 6. Verify deployment

```bash
curl https://api.loomis.digital/health
# {"status":"ok","service":"loomis-api"}

curl -I https://www.loomis.digital/login
# 200
```

1. Open [https://www.loomis.digital/login](https://www.loomis.digital/login)
2. Sign in with a seeded account (see `docs/loomis-roles-and-logins.md`)
3. If login returns **503**, check Vercel logs — `LOOMIS_API_BASE_URL` must reach a healthy API.

---

## 7. Docker build locally (optional)

From repo root:

```bash
docker build -f apps/api/Dockerfile -t loomis-api .
docker run --rm -p 8080:8080 --env-file .env.local loomis-api
curl http://localhost:8080/health
```

---

## 8. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login **502** / `api.loomis.digital` does not resolve | Add DNS CNAME for `api` → Railway (§2.5), or redeploy web (uses Railway URL fallback until DNS is ready) |
| `/api/auth/refresh` **401** on login page | Normal — no session yet; ignore unless login also fails |
| Parent login **502**, owner works | Termii SMS failed (parent needs SMS on new device). Set `SMS_OTP_DEMO_BYPASS=true` on API for demo, or register sender ID on Termii |
| Login **503** on Vercel | API down or wrong `LOOMIS_API_BASE_URL`; test `https://loomis-api-production.up.railway.app/health` |
| CORS errors in browser | API must be HTTPS; CORS is open with credentials |
| Cookies not set | `NODE_ENV=production` on Vercel (Secure cookies) |
| **Environment validation failed** | Missing required env on API service |
| Redis connection errors | Use `rediss://` for Upstash; check firewall |
| Argon2 / native module crash | Rebuild image (Dockerfile includes build tools) |

---

## 9. Later: AWS ECS (production target)

This repo’s system design targets ECS Fargate + Aurora + ElastiCache. Railway is the fastest path to a public API for `loomis.digital`. Migrate when you need multi-AZ, WAF, and Secrets Manager rotation.
