---
name: Mercado Pago Payment Integration
description: Architecture and flow for the freemium team-creation payment in Break Buddy.
---

## Flow
1. Frontend calls `POST /api/payments/create` → gets `{ paymentToken, checkoutUrl, amountArs }`
2. Token saved to `localStorage("bb-pending-payment")`, user redirected to `checkoutUrl`
3. MP redirects back to `?bb_payment=success|pending|failure&token=<uuid>`
4. Frontend detects URL params on mount → `success` or `pending` → polling step (every 2s)
5. Webhook `POST /api/webhooks/mercadopago` updates `paymentsTable.status` by `external_reference`
6. Once polling sees `status=approved`, user fills team name → `POST /api/teams` with `paymentToken`
7. Team creation atomically marks token `consumed=true` — prevents reuse

## Key env vars / secrets
- `MP_ACCESS_TOKEN` — Mercado Pago access token (secret)
- `MP_PUBLIC_KEY` — MP public key (secret, frontend-ready if ever needed)
- `MP_WEBHOOK_SECRET` — HMAC secret for webhook verification (secret)
- `MP_PRICE_ARS` — price in ARS, default 5500 (non-secret env var, already set)

## Webhook signature
MP sends `x-signature: ts={ts},v1={hmac}` and `x-request-id`.
HMAC manifest: `id:{data.id};request-date:{x-request-id};`
When `MP_WEBHOOK_SECRET` is set, verification is mandatory — missing headers cause silent drop.

**Why:** Webhook endpoint is public; without enforced verification any actor can fake payment approvals.
