# @loomis/web

Next.js 15 (App Router) web application. School-staff and platform consoles are web-first.

## Stack

- **Framework:** Next.js 15 App Router (`src/app`)
- **State:** TanStack Query v5 (server state) + Zustand (client UI state)
- **API:** `@loomis/api-client` with in-memory access token store
- **UI:** `@loomis/ui-web` (Shadcn/UI + Tailwind) on `@loomis/design-tokens`

## Development

```bash
pnpm --filter @loomis/web dev
```

Set `NEXT_PUBLIC_API_URL` to point at the Fastify API (defaults to `http://localhost:4000`).

## Route groups (planned)

`(auth)`, `(platform)`, `(regional)`, `(school)`, `(parent)` — see `Loomis_Frontend_Architecture_v1.md` §7.1.
