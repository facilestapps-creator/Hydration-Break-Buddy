---
name: Subscription flow — MP PreApproval redirect
description: How the team creation payment works: pure redirect to MP hosted checkout, no card tokenization on our side.
---

## Rule
Team creation uses MP's hosted subscription checkout (plan `init_point`) with `external_reference` and `back_url` appended as URL query params. **No card data ever touches our server or browser code.** The frontend just redirects the user to MP's page.

**Why redirect instead of Secure Fields:** MP's `POST /preapproval` always requires `card_token_id` (confirmed: returns 400 even with just `payer_email`). The redirect approach via plan init_point is simpler, more secure.

## The sandbox credential problem (UNRESOLVED — resuming here)

MP's hosted subscription checkout (`/subscriptions/checkout`) throws "Una de las partes… es de prueba" when the **PreApproval plan was created with a `TEST-...` access token** — even if both buyer and seller are test accounts.

**MP support confirmed:** For sandbox testing of subscriptions, the plan must be created with the **production access token (`APP_USR-`) of a test seller account**, NOT with the real account's `TEST-` token.

**Correct sandbox setup (per MP docs):**
1. Create two test accounts from MP panel: vendedor (seller) and comprador (buyer)
2. Log into MP panel as the **test seller**, create an app, get its **production** `APP_USR-` token
3. Create the PreApproval plans using that test seller's production token
4. Update `MP_ACCESS_TOKEN` to that test seller production token
5. Test checkout logged in as the test buyer using MP test cards

**Test seller account already created:**
- Nickname: TESTUSER4530683666965908954
- (Password in user's records — not saved here)
- **Still needed:** user must log into MP panel as this test seller, create an app, copy its `APP_USR-` production access token, set it as `MP_ACCESS_TOKEN_TEST_SELLER` secret

**Next step when resuming:** User sets `MP_ACCESS_TOKEN_TEST_SELLER` → I create new plans with it → update plan ID env vars → re-test.

## Frontend flow (TeamOnboarding.tsx)
1. User selects plan → "Monthly Subscription" screen → button "Continue to MercadoPago"
2. Click → `POST /api/payments/create` with `{ plan }` → gets `{ paymentToken, checkoutUrl }`
3. `window.location.href = checkoutUrl` → user is on MP's domain
4. User subscribes on MP's page; MP redirects to `back_url`
5. App detects `?bb_payment=success&token=...` → polling step
6. Once `status=approved` → team name step → `POST /api/teams`

**DEV simulation button:** In `step === "payment"`, there is a `⚡ DEV: Simulate payment approved` button (only visible when `import.meta.env.DEV`). It calls `POST /api/dev/approve-payment` to skip MP entirely and test the full downstream flow (polling → team creation → token consumed).

## Backend POST /payments/create (payments.ts)
- Validates plan; looks up planId from env vars
- Builds: `checkoutUrl = https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id={planId}&external_reference={paymentToken}&back_url={encodedBackUrl}`
- Inserts payment row as `pending` with `mpPreapprovalId = null`
- Returns `{ paymentToken, plan, amountArs, status: "pending", checkoutUrl }`
- **Does NOT call MP API** at payment creation time

## Dev-only endpoint (routes/dev.ts)
- `POST /api/dev/approve-payment` — takes `{ token }`, marks payment as approved with fake `mpPreapprovalId = "SIMULATED-{uuid}"`
- Returns 404 in production
- Registered in routes/index.ts only when `NODE_ENV !== "production"`

## GET /payments/:token/status (fallback polling)
- If `mpPreapprovalId` known: fetch `GET /preapproval/{id}` directly
- If not: search `GET /preapproval/search?external_reference={token}&limit=1`
- On `authorized`: update DB to `approved`, store found `mpPreapprovalId`

## Current env vars (SANDBOX — test plan IDs created with wrong token, need to redo)
- `MP_ACCESS_TOKEN` — currently set to TEST- token of real account (needs to become test seller's APP_USR- token)
- `MP_PREAPPROVAL_PLAN_ID_TEAM` = `25b31720527246419f54143567b814be` (created with TEST- — invalid for checkout)
- `MP_PREAPPROVAL_PLAN_ID_COMPANY` = `9a5df109b8f546dea08b82c82ed57c42` (same issue)

## Production plan IDs (restore after sandbox testing is done)
- Team: `789321f71f134264b312ff63636807ea`
- Company: `a938e76482ec480fa1a7665c8c73bf1e`
- `MP_ACCESS_TOKEN` and `MP_PUBLIC_KEY`: user restores from their own records (APP_USR- tokens)

## Revert to production checklist (after sandbox confirmed working)
1. Set `MP_ACCESS_TOKEN` back to real production `APP_USR-` token
2. Set `MP_PUBLIC_KEY` back (optional — not actively used)
3. Set `MP_PREAPPROVAL_PLAN_ID_TEAM` = `789321f71f134264b312ff63636807ea`
4. Set `MP_PREAPPROVAL_PLAN_ID_COMPANY` = `a938e76482ec480fa1a7665c8c73bf1e`
5. Restart API server
6. Redeploy
