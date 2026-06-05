# @loomis/web

Next.js 15 (App Router) web application. School-staff and platform consoles are web-first.

## Initialise (one-time)

This package is a stub. To scaffold the Next.js app in place:

```bash
cd apps/web
pnpm dlx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

Then wire up:
- Route groups: `(auth)`, `(platform)`, `(regional)`, `(school)`, `(parent)` (Frontend Architecture §7.1)
- `middleware.ts` edge auth gate (§7.2)
- BFF route handlers under `app/api/auth/*` for httpOnly cookie token storage (§7.3)
- TanStack Query provider + the shared `@loomis/api-client`
- Tailwind preset from `@loomis/design-tokens`

See `Loomis_Frontend_Architecture_v1.md` §7 for the full web spec.
