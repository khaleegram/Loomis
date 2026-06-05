# @loomis/mobile

Expo (React Native) app — primary interface for Parents, Students, Teachers, Class Teachers. Offline-first.

## Initialise (one-time)

This package is a stub. To scaffold the Expo app in place:

```bash
cd apps/mobile
pnpm dlx create-expo-app@latest . --template tabs
```

Then wire up:
- Expo Router role stacks: `(auth)`, `(parent)`, `(student)`, `(teacher)`, `(class-teacher)` (Frontend Architecture §8.1)
- Offline engine: `offline/db.ts` (encrypted SQLite), `offline/queue.ts`, `offline/sync-engine.ts`, `offline/crypto.ts` (§8.2–8.6)
- Token storage via `expo-secure-store`
- Biometrics via `expo-local-authentication`
- NativeWind preset from `@loomis/design-tokens`

See `Loomis_Frontend_Architecture_v1.md` §8 for the full mobile spec, especially the offline-first sync protocol.
