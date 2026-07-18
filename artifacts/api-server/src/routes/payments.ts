import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, paymentsTable } from "@workspace/db";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/auth";
import { strictLimiter } from "../lib/rate-limiters";

const router: IRouter = Router();

// MP subscription checkout base URL — plan init_point format
const MP_SUBSCRIPTION_CHECKOUT = "https://www.mercadopago.com.ar/subscriptions/checkout";

// In sandbox testing we use the test-seller token; in production use the real one.
function getMpToken(): string {
  return process.env.MP_ACCESS_TOKEN_TEST_SELLER ?? process.env.MP_ACCESS_TOKEN ?? "";
}

const PLAN_CONFIG: Record<"team" | "company", { planId: string; amountArs: number }> = {
  team: {
    planId: process.env.MP_PREAPPROVAL_PLAN_ID_TEAM ?? "",
    amountArs: 5500,
  },
  company: {
    planId: process.env.MP_PREAPPROVAL_PLAN_ID_COMPANY ?? "",
    amountArs: 14000,
  },
};


// ── Create subscription — redirect flow ───────────────────────────────────
//
// We don't tokenize a card ourselves.  Instead we build a Mercado Pago
// hosted checkout URL from the plan's init_point, embedding our
// external_reference as a query param.  The user is sent to MP's page to
// enter their card; on completion MP redirects to the back_url configured
// on the plan itself (via PUT /preapproval_plan/{id} — NOT a query param).
//
// NOTE: back_url is a plan-level attribute, not a checkout query param.
// MP ignores any &back_url=... appended to the checkout URL for preapproval
// plans. To change the return URL, update the plan via the MP API.
// Current back_url on both plans: https://sipwell.app
//
// Flow:
//   1. Build checkoutUrl from plan init_point + external_reference
//   2. Store payment as "pending" in DB
//   3. Return checkoutUrl — frontend redirects the user there
//   4. User subscribes on MP's page; MP redirects to plan's back_url
//   5. Frontend detects ?preapproval_id= in URL + bb-pending-payment in
//      localStorage, polls GET /payments/:token/status
//   6. Webhook (subscription_preapproval) also updates status when it fires
//
router.post("/payments/create", requireAuth, strictLimiter, async (req, res): Promise<void> => {
  const userId = req.userId;

  const { plan } = req.body as { plan?: unknown };

  if (plan !== "team" && plan !== "company") {
    res.status(400).json({ error: "plan must be 'team' or 'company'" });
    return;
  }

  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (userRows.length === 0) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  const { planId, amountArs } = PLAN_CONFIG[plan];
  if (!planId) {
    res.status(500).json({ error: "Subscription plan not configured on server" });
    return;
  }

  const paymentToken = randomUUID();

  // Build MP hosted checkout URL. Only external_reference is embedded here;
  // back_url is configured at the plan level, not as a query param.
  const checkoutUrl = `${MP_SUBSCRIPTION_CHECKOUT}?preapproval_plan_id=${planId}&external_reference=${paymentToken}`;

  console.log("[payments] checkout URL built:", checkoutUrl);

  // ── Persist to DB ─────────────────────────────────────────────────────
  await db.insert(paymentsTable).values({
    paymentToken,
    userId,
    status: "pending",
    plan,
    amountArs,
    mpPreapprovalId: null,
  });

  res.status(201).json({
    paymentToken,
    plan,
    amountArs,
    status: "pending",
    checkoutUrl,
  });
});

// ── Poll payment status ────────────────────────────────────────────────────
// Called by the frontend after the user returns from MP's checkout page.
// The webhook (subscription_preapproval) should have already fired, but we
// keep this as a fallback for webhook delay.
router.get("/payments/:token/status", async (req, res): Promise<void> => {
  const { token } = req.params;
  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  const rows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.paymentToken, token));

  if (rows.length === 0) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const payment = rows[0];

  if (payment.status === "pending") {
    try {
      let preapprovalStatus: string | null = null;
      let preapprovalId: string | null = payment.mpPreapprovalId ?? null;

      if (preapprovalId) {
        // We already have the preapproval ID — fetch directly
        const mpRes = await fetch(
          `https://api.mercadopago.com/preapproval/${preapprovalId}`,
          { headers: { Authorization: `Bearer ${getMpToken()}` } }
        );
        if (mpRes.ok) {
          const pa = await mpRes.json() as { id: string; status: string; [k: string]: unknown };
          console.log("[payments/status] source=direct token=%s preapprovalId=%s mpRaw=%j", token, preapprovalId, pa);
          preapprovalStatus = pa.status;
        } else {
          console.warn("[payments/status] source=direct token=%s preapprovalId=%s mpHttpStatus=%d", token, preapprovalId, mpRes.status);
        }
      } else {
        // No ID yet — search by external_reference (set by MP from the checkout URL param)
        const searchRes = await fetch(
          `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(token)}&limit=1`,
          { headers: { Authorization: `Bearer ${getMpToken()}` } }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json() as {
            results?: Array<{ id: string; status: string; [k: string]: unknown }>;
          };
          const found = searchData.results?.[0];
          console.log("[payments/status] source=search token=%s foundId=%s mpRaw=%j", token, found?.id ?? null, found ?? null);
          if (found) {
            preapprovalId = found.id;
            preapprovalStatus = found.status;
          }
        } else {
          console.warn("[payments/status] source=search token=%s mpHttpStatus=%d", token, searchRes.status);
        }
      }

      if (preapprovalStatus === "authorized") {
        await db
          .update(paymentsTable)
          .set({ status: "approved", mpPreapprovalId: preapprovalId, updatedAt: new Date() })
          .where(eq(paymentsTable.paymentToken, token));
        res.json({ paymentToken: token, status: "approved", mpPaymentId: preapprovalId });
        return;
      } else if (preapprovalStatus === "cancelled") {
        await db
          .update(paymentsTable)
          .set({ status: "cancelled", mpPreapprovalId: preapprovalId, updatedAt: new Date() })
          .where(eq(paymentsTable.paymentToken, token));
        res.json({ paymentToken: token, status: "cancelled", mpPaymentId: preapprovalId });
        return;
      } else if (preapprovalId && preapprovalId !== payment.mpPreapprovalId) {
        // Store the found ID even if still pending, so next poll hits it directly
        await db
          .update(paymentsTable)
          .set({ mpPreapprovalId: preapprovalId, updatedAt: new Date() })
          .where(eq(paymentsTable.paymentToken, token));
      }
    } catch (e) {
      console.warn("[payments] MP status check failed:", e);
    }
  }

  res.json({
    paymentToken: token,
    status: payment.status,
    mpPaymentId: payment.mpPreapprovalId ?? null,
  });
});

export default router;
