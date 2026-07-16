---
name: Subscription flow — MP PreApproval
description: How the team creation payment works: frontend card tokenization + backend POST /preapproval
---

## Rule
Team creation uses MP PreApproval API (`POST /preapproval`) with PCI-compliant client-side card tokenization. The frontend uses MP.js Secure Fields to get a one-time `card_token_id`; the backend calls `POST /preapproval` with that token + `payer_email` + `external_reference`.

**Why:** Passing `external_reference` as a query param on the checkout URL was confirmed broken — MP's `/preapproval/search?external_reference=TOKEN` returns results by payer_id (all subscriptions of that account), not filtered by the token. A real MP sandbox search returned 3 unrelated preapprovals (El Gato y La Caja 2018, MercadoLibre 2016, Club de la curiosidad 2022) when searched with our UUID — none matched. `external_reference` must be set via the API body in `POST /preapproval` to be reliable.

## Frontend card flow
1. `MPCardForm.tsx` dynamically loads `https://sdk.mercadopago.com/js/v2`
2. Mounts three MP Secure Fields: `cardNumber`, `expirationDate`, `securityCode` (iframes — card data never reaches our server)
3. User fills in: email, cardholder name, card fields, DNI (required by MP Argentina)
4. On submit: `cardNumber.createCardToken({ cardholderName, identificationType: "DNI", identificationNumber })` → one-time `card_token_id`
5. `TeamOnboarding.tsx` calls `POST /payments/create` with `{ plan, cardTokenId, payerEmail }`

## Backend POST /payments/create
- Validates plan, cardTokenId, payerEmail
- Calls `POST https://api.mercadopago.com/preapproval` with `{ preapproval_plan_id, card_token_id, payer_email, external_reference: paymentToken, back_url }`
- If MP returns `status === "authorized"` → marks payment approved immediately, returns `{ status: "approved" }` → frontend skips polling, goes directly to create-team step
- If MP returns `status === "pending"` → returns `{ status: "pending", checkoutUrl: init_point }` → frontend redirects (3DS or similar auth)

## GET /api/config
- New endpoint that returns `{ mpPublicKey: process.env.MP_PUBLIC_KEY }`
- Frontend fetches on mount to init the MP SDK; public key is safe to expose (it IS public by design)

## GET /payments/:token/status (fallback polling)
- Used only if subscription goes through 3DS redirect (the "pending" case)
- Polls `GET /preapproval/:mpPreapprovalId` directly (NOT `/preapproval/search`) since we store `mpPreapprovalId` at payment creation time

## Env vars
- `MP_PREAPPROVAL_PLAN_ID_TEAM` = 789321f71f134264b312ff63636807ea
- `MP_PREAPPROVAL_PLAN_ID_COMPANY` = a938e76482ec480fa1a7665c8c73bf1e
- `MP_PUBLIC_KEY` — exposed via GET /api/config (no VITE_ duplication needed)

## Key schema fields
- `teams`: plan, memberLimit, logoUrl, subscriptionStatus, currentPeriodEnd, mpPreapprovalId
- `payments`: plan, mpPreapprovalId (mpPreferenceId nullable), status (approved|pending|cancelled)

## Member limit / logo / subscription effects
- Team plan: memberLimit=10, blocks join at 403; nearMemberLimit = memberCount >= memberLimit - 1
- Company plan: memberLimit=null (unlimited); logo via PATCH /teams/:teamId/logo (.png/.jpg/.jpeg/.webp URL)
- breaks.ts blocks new break logging if subscriptionStatus is "paused" or "cancelled"
