# @loomis/mobile

Expo **SDK 56** app (official `create-expo-app` baseline + Loomis routes).

## Local dev

```bash
pnpm db:up
pnpm dev          # API + web + mobile
# or
pnpm dev:mobile
```

- **Metro:** port **8085** (`constants/ports.cjs`)
- **API:** `http://localhost:18080/api/v1` (same as web)

### Phone scanning

1. Restart with cache clear: `pnpm dev:mobile` (uses `--lan --clear`)
2. QR should show `exp://192.168.x.x:8085` — **not** `127.0.0.1`
3. Same Wi‑Fi, VPN off; allow Node through Windows Firewall on **8085** (Metro) and **18080** (API)
4. The app auto-uses your PC’s LAN IP for API calls when you scan the QR code (not `localhost`)
5. Still stuck? `pnpm --filter @loomis/mobile dev:tunnel` and scan again

**Expo Go** must be current (SDK 56). **Push notifications** are skipped in Expo Go — use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) for push testing.

## Test logins (Greenfield Academy Lagos)

Requires `pnpm db:seed` (includes Greenfield rich seed):

```bash
pnpm db:up
pnpm db:seed
```

**Password for all accounts below:** `LoomisDev2026!`

| Mobile role | Email | Greenfield data |
|---|---|---|
| **Parent** | `parent.jss3b@greenfield.loomis.com` | Linked child in **JSS3 B** — fees, attendance, results |
| **Class teacher** | `teacher03@greenfield.loomis.com` | **JSS1 B** class teacher — attendance / QuickMarkGrid |
| **Teacher** | `teacher01@greenfield.loomis.com` | Subject teacher only — gradebook |
| **Student** | *(printed by seed)* | Student portal email in seed output |

School staff log in with **password only** (no MFA). Parent has MFA disabled in seed.

Web-only at same school (same password): `principal@greenfield.loomis.com`, `timetable@greenfield.loomis.com`, `exam@greenfield.loomis.com`.

## Stacks

`(auth)` · `(parent)` · `(student)` · `(class-teacher)` · `(teacher)` · `(dev)/showcase`

Layout catalog: `@loomis/ui-mobile`
