# Loomis × Nomba — Per-Student Fee Collection via Dedicated Virtual Accounts

**Hackathon submission concept · Strategy B · Plain English**

---

## The Problem We Are Solving

Nigerian private schools on Loomis still collect a large share of term fees by **bank transfer**. Today, when a parent sends money to the school’s generic account, the school has no automatic way to know which child the payment is for. The **Cashier** logs the payment manually. The **Accountant** verifies it against bank records. That queue is slow, error-prone, and painful for everyone.

Loomis already handles online card payments and offline verification workflows. What it does not yet do is give every student their own **persistent bank account number** so parents can transfer directly — and have Loomis reconcile that transfer automatically, the same way it already settles verified online payments.

This hackathon integration fixes that gap using **Nomba virtual accounts**.

---

## The Core Idea: One Dedicated NUBAN Per Student

When a student is registered and active in a school on Loomis, the platform provisions **one permanent virtual account** tied to that student’s profile.

- The account belongs to the **student**, not the parent and not the school’s generic treasury account.
- The account stays the same across the term — parents save it in their banking app and reuse it whenever fees are due.
- The account name shown in the bank app is clear, for example: **“Loomis — Ada Okonkwo (Greenfield Academy)”**.
- Every school tenant is isolated. Student A at School X never shares an account with Student B at School Y.

Parents see this account on the **Parent Fees** page at loomis.digital. They copy the account number, open their bank app, and transfer. No redirect. No card form. No screenshot upload.

---

## How Money Flows (Happy Path)

1. A parent opens **Parent Fees** for their linked child and sees what is owed for the current term (and any arrears from prior terms).
2. On the same screen, they see the child’s **dedicated Nomba virtual account** — account number, bank name, and account name.
3. The parent transfers the exact amount owed (or any amount — see unhappy paths below).
4. Nomba receives the transfer and sends a **payment success webhook** to Loomis at `api.loomis.digital`.
5. Loomis reads the webhook, identifies which student the account belongs to, and records a **verified online payment** — instantly, with no Cashier or Accountant manual step.
6. The payment is applied to the student’s **open fee invoices**, oldest first (arrears before current term).
7. The parent’s **outstanding balance drops**, a **receipt** appears in the portal, and a **notification** is sent (email and/or push).
8. Behind the scenes, Loomis fires the normal **payment verified** event so **PSF settlement** and school finance records stay correct — same integrity rules as any other verified payment channel.

The school’s Accountant sees the payment in the **Payment Log** as already verified. The Cashier never had to touch it.

---

## What Changes for Each Role

### Parent

- Sees a permanent “Pay by bank transfer” account for each linked child.
- Transfers from any Nigerian bank at any time.
- Gets instant confirmation when Loomis receives the money.
- Sees updated balance, receipt, and fee credit (if they overpaid).

### Cashier

- Stops being the middleman for parent-initiated bank transfers.
- Still logs true offline payments (cash, POS, walk-in transfers to the school’s physical account) when those happen outside Loomis rails.

### Accountant

- No longer manually verifies parent bank transfers that landed on student virtual accounts.
- Still verifies offline payments logged by Cashiers when those use non-automated channels.
- Sees all Nomba-settled transfers as **verified** in the payment log from day one.

### School Owner / Principal

- Better collection visibility: who paid, how much, when — without waiting for bursar reconciliation.
- Fewer “I paid but the school says I didn’t” disputes because every transfer maps to one student.

### Platform (Loomis)

- Nomba becomes a **collection rail** alongside existing online payment providers.
- Multi-tenant isolation preserved: each school’s students have their own accounts, scoped by tenant.

---

## The Reconciliation Engine (What Happens When Money Arrives)

When a webhook hits Loomis, the system does not blindly mark “fully paid.” It runs a **reconciliation pass**:

1. **Identify the student** from the virtual account reference stored when the account was created.
2. **Read the transfer amount** from Nomba’s payload (and optionally confirm it against Nomba’s transaction API before crediting).
3. **Look up all open fee invoices** for that student, across terms if needed.
4. **Apply the money oldest-first** — arrears cleared before current term fees.
5. **Update invoice balances** and issue a receipt for the amount received.
6. **Trigger parent notification** with a plain-English summary of what happened.

This is the same fair allocation logic Loomis already uses for online payments — extended to inbound bank transfers where the parent chooses the amount at transfer time.

---

## Unhappy Paths (The Parts That Win the Hackathon)

Judges want to see what happens when reality is messy. Loomis should handle these cleanly.

### Underpayment — Parent sends less than what is owed

**Example:** Term fees are ₦150,000. Parent transfers ₦100,000.

**What Loomis does:**

- Credits ₦100,000 to the student’s open invoices (FIFO).
- Leaves **₦50,000 still outstanding**.
- Does **not** mark the term as fully paid.
- Does **not** break or throw an error.
- Sends the parent a notification: *“We received ₦100,000. ₦50,000 is still outstanding for [Child Name] — [Term].”*
- Parent Fees page shows the reduced balance and the same dedicated account for the next transfer.

**What Loomis does not do:** Pretend the bill is settled. Silently ignore the shortfall.

---

### Overpayment — Parent sends more than what is owed

**Example:** Term fees are ₦150,000. Parent transfers ₦160,000.

**What Loomis does:**

- Applies ₦150,000 to clear the invoice(s).
- Puts the extra **₦10,000 into the student’s fee credit balance** (Loomis’s existing “pay-ahead” surplus — not a separate wallet product).
- Shows the parent: *“₦150,000 applied to Term 2 fees. ₦10,000 credited toward future fees.”*
- When the school issues the **next term’s invoice**, Loomis **automatically deducts** the fee credit before showing what is still owed.

**What Loomis does not do:** Lose the extra money. Refund automatically without school approval (refunds stay in the existing approval workflow if the school wants money back).

---

### Pay-ahead — Parent transfers when nothing is owed yet

**Example:** School has not issued next term’s invoice, or balance is zero. Parent sends ₦50,000 anyway.

**What Loomis does:**

- Records the full amount as **fee credit** on the student’s account.
- Shows the credit balance on Parent Fees.
- Applies it automatically when the next invoice is issued.

---

### Duplicate webhook — Nomba sends the same event twice

**Example:** Network retry causes the same `payment_success` webhook to arrive twice.

**What Loomis does:**

- Logs every incoming Nomba transaction ID in the **webhook events** store.
- On first arrival: process normally.
- On duplicate: **safely ignore** — no second credit, no double receipt, no balance change.
- Returns success to Nomba so retries stop.

**Why this matters:** Double-crediting is how payment systems lose trust. Loomis already treats webhooks this way for other gateways; Nomba follows the same rule.

---

### Unknown or misrouted transfer

**Example:** Webhook arrives for an account reference Loomis does not recognise, or the student has been withdrawn.

**What Loomis does:**

- Does **not** guess which student to credit.
- Logs a **reconciliation exception** for the Accountant to review.
- Keeps the platform safe rather than assigning money to the wrong child.

---

### Partial payment across multiple terms

**Example:** Child owes ₦60,000 from last term and ₦150,000 this term. Parent sends ₦100,000.

**What Loomis does:**

- Clears the full ₦60,000 arrears first.
- Applies the remaining ₦40,000 to the current term.
- Shows a clear breakdown on the receipt and in the parent portal.

---

## Notifications (Plain English, No Jargon)

After every successful virtual account transfer, the parent gets a message tailored to the outcome:

| Situation | Message tone |
|---|---|
| Full payment | “Payment received. [Child]’s [Term] fees are fully paid. Receipt ready.” |
| Partial payment | “Payment received: ₦X. ₦Y still outstanding for [Child].” |
| Overpayment | “Payment received: ₦X applied. ₦Y saved toward future fees.” |
| Pay-ahead only | “₦X received and saved toward [Child]’s next fees.” |

School staff do not need a notification for every transfer unless configured — the Payment Log updates in real time.

---

## What Parents See on loomis.digital

On **Parent Fees** for each child:

1. **Hero summary** — total owed, arrears if any, term context.
2. **Dedicated bank account card** — account number, bank, account name, copy buttons.
3. **Short instruction** — “Transfer any amount from your bank app. We’ll apply it to [Child]’s fees automatically.”
4. **Fee credit strip** (when applicable) — “₦10,000 credit toward future fees.”
5. **Payment history** — each transfer with date, amount, status, receipt link.
6. **Outstanding banner** after partial pay — “₦50,000 remaining.”

Mobile-friendly. No horizontal scroll. Works at phone width.

---

## What School Staff See

### Accountant — Payment Log

- Nomba virtual account transfers appear as **verified online payments**.
- Channel clearly labelled (e.g. “Bank transfer — Nomba VA”).
- No “Verify” button — already settled.
- Reconciliation exceptions appear separately for manual review.

### Cashier

- Unchanged for cash and walk-in offline payments.
- Virtual account transfers never enter the unverified queue.

---

## Relationship to Existing Loomis Finance Rules

This feature **extends** Loomis; it does not replace core rules.

- **PSF obligations** are still created at census lock — not by payment. Payments **settle** obligations; they do not create them.
- **Verified payments** still drive PSF settlement through the normal event pipeline.
- **Refunds** for overpayment still go through the school’s existing refund approval chain if the school chooses to return money — fee credit is the default automatic handling.
- **Tenant isolation** holds: every query is scoped to the school. Parent portal never mixes children across tenants.
- **Audit trail** records every webhook, settlement, and balance change.

---

## Why Nomba + Loomis Is a Real Nigerian Use Case

- Parents already prefer bank transfer over card for large school fees.
- Schools already struggle to match transfers to students.
- Loomis is already a live multi-tenant school platform at **loomis.digital** — not a hackathon mockup.
- Nomba provides the **account infrastructure**; Loomis provides the **student, invoice, receipt, and compliance layer** on top.

Together: **every child gets their own account number; every transfer updates the right balance automatically.**

---

## Hackathon Demo Story (What We Show Judges)

1. Log in as a parent on **www.loomis.digital**.
2. Open fees for a demo child — ₦150 outstanding (sandbox amount).
3. Show the **dedicated virtual account**.
4. Transfer from a bank app (sandbox: up to ₦150).
5. Refresh — balance updated, receipt issued, notification sent.
6. **Replay the webhook** — balance unchanged (idempotency proof).
7. Transfer again with wrong amount — show **underpayment** (balance partially cleared) or **overpayment** (fee credit appears).
8. Switch to Accountant view — payment already verified, no manual step.

---

## What We Are Not Building for the Hackathon

- Replacing every payment channel — Paystack checkout can stay; this adds bank transfer automation.
- A generic “wallet” product — we use Loomis **fee credits** for surplus.
- Full refund automation for overpayments.
- Virtual accounts for staff salaries or school treasury — student fee collection only.
- Cross-school shared accounts — one student, one account, one tenant.

---

## One-Line Pitch

**Loomis gives every student their own bank account number; when parents pay school fees by transfer, Nomba tells us, and the right child’s balance updates instantly — including when they pay too little, too much, or twice.**
