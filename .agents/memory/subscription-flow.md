---
name: Subscription flow — MP PreApproval redirect
description: How the team creation payment works: pure redirect to MP hosted checkout, no card tokenization on our side.
---

## Rule
Team creation uses MP's hosted subscription checkout (plan `init_point`) with `external_reference` and `back_url` appended as URL query params. **No card data ever touches our server or browser code.** The frontend just redirects the user to MP's page.

**Why redirect instead of Secure Fields:** MP's `POST /preapproval` always requires `card_token_id` (confirmed: returns 400 "card_token_id is required" even with just `payer_email`). The redirect approach via plan init_point is simpler, more secure, and confirmed working in sandbox.

**Why NOT search by external_reference in polling initially:** confirmed in earlier sessions that `GET /preapproval/search?external_reference=TOKEN` can return unrelated results by payer account. However, MP DOES embed `external_reference` from the checkout URL param into the created subscription, so after the subscription exists the search is reliable. The webhook is the primary update path; polling search is a fallback.

## Frontend flow (TeamOnboarding.tsx)
1. User selects plan → "Monthly Subscription" screen → single button "Continue to MercadoPago"
2. Click → `POST /api/payments/create` with `{ plan }` → gets `{ paymentToken, checkoutUrl }`
3. `window.location.href = checkoutUrl` → user is on MP's domain
4. User subscribes on MP's page; MP redirects to `back_url`
5. App detects `?bb_payment=success&token=...` → polling step
6. Once `status=approved` → team name step → `POST /api/teams`

## Backend POST /payments/create (payments.ts)
- Validates plan; looks up planId from env vars
- Builds: `checkoutUrl = https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id={planId}&external_reference={paymentToken}&back_url={encodedBackUrl}`
- Inserts payment row as `pending` with `mpPreapprovalId = null`
- Returns `{ paymentToken, plan, amountArs, status: "pending", checkoutUrl }`
- **Does NOT call MP API** at payment creation time — no credentials needed for this step

## GET /payments/:token/status (fallback polling)
- If `mpPreapprovalId` known: fetch `GET /preapproval/{id}` directly
- If not (fresh return from MP): search `GET /preapproval/search?external_reference={token}&limit=1`
- On `authorized`: update DB to `approved`, store found `mpPreapprovalId`
- On `cancelled`: update DB to `cancelled`
- Stores found `mpPreapprovalId` even if still pending (so next poll is direct)

## Webhook (subscription_preapproval) — primary update path
- Fires when user completes subscription on MP's page
- Payload contains `external_reference` → match to `paymentsTable.paymentToken`
- Updates `status` and `mpPreapprovalId`

## Env vars
- `MP_PREAPPROVAL_PLAN_ID_TEAM` = 789321f71f134264b312ff63636807ea (production)
- `MP_PREAPPROVAL_PLAN_ID_COMPANY` = a938e76482ec480fa1a7665c8c73bf1e (production)
- `MP_ACCESS_TOKEN` — only used for polling/webhook verification, NOT for checkout URL creation
- `MP_PUBLIC_KEY` — no longer used (kept in secrets, safe to leave)
- `GET /api/config` endpoint — no longer needed (kept, returns mpPublicKey harmlessly)
- `MPCardForm.tsx` — DELETED

## Sandbox test plan IDs (TEST- credentials)
- Team (test): `25b31720527246419f54143567b814be`
- Company (test): `9a5df109b8f546dea08b82c82ed57c42`
- Created 2026-07-16 via MP API with TEST access token; collector_id 60438659

## Revert to production checklist
1. Set `MP_ACCESS_TOKEN` back to `APP_USR-` token
2. Set `MP_PUBLIC_KEY` back to `APP_USR-` key (optional — not actively used)
3. Set `MP_PREAPPROVAL_PLAN_ID_TEAM` = `789321f71f134264b312ff63636807ea`
4. Set `MP_PREAPPROVAL_PLAN_ID_COMPANY` = `a938e76482ec480fa1a7665c8c73bf1e`
5. Restart API server
