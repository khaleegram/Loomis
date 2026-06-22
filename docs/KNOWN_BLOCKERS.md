# Loomis — Known BLOCKED Items (Sprint 14)

Runtime integrations and ops dependencies **not yet wired** in local/dev.  
Search codebase: `// BLOCKED:`

Do not stub these in application code — see `loomis-implementation-guardrails.mdc`.

---

## External credentials (production)

| Integration | Env vars | Impact |
|-------------|----------|--------|
| **Termii SMS** | `TERMII_API_KEY`, `TERMII_SENDER_ID` | Core login SMS, census OTP, parent payment SMS. Local dev uses `000000` bypass when key unset. |
| **AWS SES** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_REGION` | Transactional email (invitations, offer letters, security alerts). |
| **AWS S3** | `S3_BUCKET`, `S3_REGION`, credentials | File uploads, branding logos, document storage. |
| **Paystack / gateways** | Provider secret keys + webhook secrets | Live online fee payments. |
| **FCM / APNs** | EAS project ID, push credentials | Mobile push notifications. |
| **ClamAV scan** | Terraform + Lambda (infra) | Upload malware scanning hook. |

---

## Application BLOCKED (by area)

| Area | File / module | What's missing |
|------|---------------|----------------|
| Auth | `auth.service.ts` | SEC-AUTH-006 email on new device login |
| Sessions | `session.service.ts` | SEC-AUTH-010 notify user when prior session revoked |
| Staff invite | `staff.service.ts` | AWS SES one-time invitation link email |
| Parent OTP | `parent-otp.service.ts` | SES and/or Termii for parent link acceptance |
| Staff repo | `staff.repository.ts` | Non-RLS lookup for invitation accept without tenant hint |
| Storage | `malware-scan.hook.ts` | ClamAV Lambda infrastructure |
| Academic | `academic-year.service.ts` | FR-ASM-002 PSF obligation check on year rollover |
| Risk | `break-glass.service.ts` | Owner notification on break-glass session |
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
| Staff invitation email | Copy invite token from API/DB in dev (or check Mailpit if configured) |
| Online parent payment | Use dev Paystack test keys if configured in `.env.local` |

---

*Last updated: Sprint 14.*
