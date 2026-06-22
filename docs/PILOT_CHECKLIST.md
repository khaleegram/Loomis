# Loomis Role Experience — Pilot Checklist (Sprint 14)

Use when onboarding a **real school** for the 2-week Core pilot (optional Advanced pilot).

---

## Pre-pilot (engineering)

- [ ] `pnpm --filter @loomis/web build` clean
- [ ] `pnpm --filter @loomis/core test` pass
- [ ] Core QA matrix signed: `docs/CORE_QA_MATRIX.md`
- [ ] Advanced QA matrix signed (if Advanced pilot): `docs/ADVANCED_QA_MATRIX.md`
- [ ] Known blockers reviewed with school: `docs/KNOWN_BLOCKERS.md`
- [ ] Termii prod keys configured **or** school accepts SMS bypass limitations in staging
- [ ] Tenant provisioned with `experienceTier=core` (Advanced: Owner enables in Settings)

---

## Core pilot — exit criteria (2 weeks)

School staff can complete **without engineering support**:

| Flow | Actor | Pass |
|------|-------|------|
| Register / enroll student | Admin Officer | ☐ |
| Log offline payment | Finance Officer (combined) | ☐ |
| Verify payment (not self) | Finance Officer | ☐ |
| Census lock | School Owner (SMS OTP) | ☐ |
| Publish results | Exam Officer | ☐ |
| Parent pay fees (online or record) | Parent | ☐ |
| Owner approve role change | Owner (one-tap) | ☐ |
| Audit log dispute lookup | Owner / Principal | ☐ |

**Nav rule:** No visible nav link returns 403 for the logged-in role + tier.

---

## Advanced pilot — optional add-ons

| Flow | Pass |
|------|------|
| Owner enables Advanced in Settings | ☐ |
| Split finance: Cashier + Accountant distinct | ☐ |
| 4-step refund through Workflow Inbox | ☐ |
| Principal Operations dashboard + inbox | ☐ |
| Optional TOTP enrollment | ☐ |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | Build + automated tests |
| Product | | | QA matrices + pilot flows |
| School Owner | | | Core pilot acceptance |

---

## Rollback

- Set `experienceTier=core` and disable Advanced flags via platform if needed
- Finance mode `combined` restores single finance officer UX
