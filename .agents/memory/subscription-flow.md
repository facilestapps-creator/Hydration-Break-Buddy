---
name: Subscription flow — MP PreApproval
description: How the team creation payment changed from one-time Preference to recurring PreApproval (subscription)
---

## Rule
Team creation uses MP PreApproval API (`POST /preapproval`) with plan IDs from env vars, NOT Preference.

**Why:** Changed to two monthly subscription plans (Team / Company) instead of a single one-time payment.

## How to apply
- `POST /payments/create` receives `{ plan: "team" | "company" }`, calls MP `/preapproval`, stores `mpPreapprovalId` in payments table.
- `GET /payments/:token/status` fallback: polls `GET /preapproval/:id` if `mpPreapprovalId` exists.
- Webhook `subscription_preapproval` → fetches preapproval from MP → updates payment status to "approved" (when authorized) → updates team subscriptionStatus.
- Webhook `subscription_authorized_payment` → fetches `/preapproval_payment/:id` → gets `preapproval_id` → extends team `currentPeriodEnd` +1 month.

## Key schema additions
- `teams`: plan, memberLimit, logoUrl, subscriptionStatus, currentPeriodEnd, mpPreapprovalId
- `payments`: plan, mpPreapprovalId (mpPreferenceId made nullable)

## Env vars (shared)
- `MP_PREAPPROVAL_PLAN_ID_TEAM` = 789321f71f134264b312ff63636807ea
- `MP_PREAPPROVAL_PLAN_ID_COMPANY` = a938e76482ec480fa1a7665c8c73bf1e

## Member limit logic
- Team plan: memberLimit=10, blocks join with 403 when at limit
- nearMemberLimit flag: true when memberCount===9 on team plan (shown as banner in leaderboard)
- Company plan: memberLimit=null (unlimited)

## Logo
- `PATCH /teams/:teamId/logo` validates URL ends in .png/.jpg/.jpeg/.webp
- Only company plan teams; user must be a member

## Subscription status effects
- breaks.ts blocks new break logging if team subscriptionStatus is "paused" or "cancelled"
- Frontend shows banners in LeaderboardModal for non-active statuses
