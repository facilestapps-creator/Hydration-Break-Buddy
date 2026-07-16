---
name: Mercado Pago Payment Integration
description: Architecture and flow for the freemium team-creation subscription payment in Break Buddy.
---

## Flow
1. Frontend calls `POST /api/payments/create` with `{ plan }` → gets `{ paymentToken, checkoutUrl }`
2. Token saved to `localStorage("bb-pending-payment")`, user redirected to `checkoutUrl` (MP's hosted page)
3. MP redirects back to `?bb_payment=success|failure&token=<uuid>`
4. Frontend detects URL params on mount → success/pending → polling step (every 2s)
5. Webhook `POST /api/webhooks/mercadopago` updates `paymentsTable.status` by `external_reference`
6. Once polling sees `status=approved`, user fills team name → `POST /api/teams` with `paymentToken`
7. Team creation atomically marks token `consumed=true` — prevents reuse

## Key env vars / secrets
- `MP_ACCESS_TOKEN` — Mercado Pago access token (used for polling + webhook verification only)
- `MP_WEBHOOK_SECRET` — HMAC secret for dashboard-registered webhooks only (not IPN — see below)
- `MP_PREAPPROVAL_PLAN_ID_TEAM` / `MP_PREAPPROVAL_PLAN_ID_COMPANY` — plan IDs for checkout URL

## Webhook modes — CRITICAL distinction

MP has two notification systems:

### IPN (Instant Payment Notification) — what we use
Set via `notification_url` in the preference body. MP sends a POST with `{ type: "payment", data: { id } }`.
**Does NOT send `x-signature` or `x-request-id` headers.** Security comes from fetching the payment from MP API and trusting only that response.

### Dashboard webhooks
Registered in the MP developer panel. MP sends HMAC headers (`x-signature: ts=...,v1=...`) + `x-request-id`.
HMAC manifest: `id:{data.id};request-date:{x-request-id};`
Secret is `MP_WEBHOOK_SECRET` from the MP dashboard (not user-chosen).

### Signature verification rule
- If `x-signature` AND `x-request-id` are present: verify HMAC (reject if wrong or if no secret configured)
- If headers are absent (IPN): allow through, verify payment via MP API call

**Why:** Setting `notification_url` uses IPN mode which has no signature headers. Enforcing header presence was silently blocking all webhooks and leaving payments stuck in "pending".
