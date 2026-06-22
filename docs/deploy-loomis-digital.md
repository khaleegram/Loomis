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

Optional (when ready): `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`.

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

**Recommended**

| Variable | Value |
|----------|--------|
| `PAYMENT_REDIRECT_BASE_URL` | `https://www.loomis.digital/payments/complete` |
| `PAYSTACK_SECRET_KEY` | Paystack live/test secret |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook secret |
| `SES_REGION` | e.g. `af-south-1` |
| `SES_FROM_EMAIL` | `noreply@loomis.digital` (domain verified in SES) |

Railway sets `PORT` automatically; the API uses it when `API_PORT` is unset.

### 2.5 Custom domain for API

1. API service → **Settings** → **Networking** → **Custom Domain** → `api.loomis.digital`
2. At your DNS provider (where `loomis.digital` is managed), add the CNAME Railway gives you.
3. Wait for TLS (usually a few minutes).

### 2.6 Run migrations

**Option A — Railway one-off command** (API service → Settings → Deploy → Custom start / or use CLI):

```bash
railway run pnpm db:migrate:prod
```

Run from the API service with env vars linked (or use Railway’s “Run command” with the deployed image).

**Option B — Local against prod** (careful):

```bash
cd apps/api
DATABASE_URL="postgresql://..." DATABASE_AUDIT_URL="postgresql://..." pnpm db:migrate:prod
```

### 2.7 Seed demo data (optional)

```bash
railway run pnpm db:seed
railway run pnpm db:seed:rich
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
| Login **503** on Vercel | API down or wrong `LOOMIS_API_BASE_URL`; test `/health` |
| CORS errors in browser | API must be HTTPS; CORS is open with credentials |
| Cookies not set | `NODE_ENV=production` on Vercel (Secure cookies) |
| **Environment validation failed** | Missing required env on API service |
| Redis connection errors | Use `rediss://` for Upstash; check firewall |
| Argon2 / native module crash | Rebuild image (Dockerfile includes build tools) |

---

## 9. Later: AWS ECS (production target)

This repo’s system design targets ECS Fargate + Aurora + ElastiCache. Railway is the fastest path to a public API for `loomis.digital`. Migrate when you need multi-AZ, WAF, and Secrets Manager rotation.
