# Loomis — Known BLOCKED Items (Sprint 14)

Runtime integrations and ops dependencies **not yet wired** in local/dev.  
Search codebase: `// BLOCKED:`

Do not stub these in application code — see `loomis-implementation-guardrails.mdc`.

---

## External credentials (production)

| Integration | Env vars | Impact |
|-------------|----------|--------|
| **Termii SMS** | `TERMII_API_KEY`, `TERMII_SENDER_ID` | Core login SMS, census OTP, parent new-device login. Local dev uses `000000` bypass when key unset. |
| **Resend email** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transactional email (invitations, offer letters, security alerts). |
| **AWS S3** | `S3_BUCKET`, `S3_REGION`, credentials | File uploads, branding logos, document storage. |
| **Paystack / gateways** | Provider secret keys + webhook secrets | Live online fee payments. |
| **FCM / APNs** | EAS project ID, push credentials | Mobile push notifications. |
| **ClamAV scan** | Terraform + Lambda (infra) | Upload malware scanning hook. |

---

## Application BLOCKED (by area)

| Area | File / module | What's missing |
|------|---------------|----------------|
| Auth | `auth.service.ts` | — (lockout + password reset wired) |
| Sessions | `session.service.ts` | — (displaced-session email wired) |
| Staff invite | `staff.service.ts` | — (Resend invitation email wired) |
| Parent OTP | `parent-otp.service.ts` | — (Resend + Termii wired) |
| Staff repo | `staff.repository.ts` | Non-RLS lookup for invitation accept without tenant hint |
| Storage | `malware-scan.hook.ts` | ClamAV Lambda infrastructure |
| Academic | `academic-year.service.ts` | FR-ASM-002 PSF obligation check on year rollover |
| Risk | `break-glass.service.ts` | — (owner notification via comms outbox) |
| Mobile | `push-notifications.ts` | EAS/FCM production push setup |

---

## Role experience v1 — out of scope (not BLOCKED)

| Item | Notes |
|------|--------|
| Live pilot schools | Process checklist: `docs/PILOT_CHECKLIST.md` |
| Product sign-off | Manual QA matrices must pass first |
| Regional multi-branch | Enterprise product-defined; not in v1 |

---

## Local dev workaround summary

| Need | Workaround |
|------|------------|
| Core SMS MFA | Enter `000000` when `TERMII_API_KEY` is unset |
| Platform MFA | TOTP secret `JBSWY3DPEHPK3PXP` |
| Staff invitation email | Invitation link emailed via Resend; dev bypass `000000` for parent OTP when unset |
| Online parent payment | Use dev Paystack test keys if configured in `.env.local` |

---

*Last updated: Sprint 14.*
