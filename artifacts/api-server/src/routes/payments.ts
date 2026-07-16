import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, paymentsTable } from "@workspace/db";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/auth";
import { strictLimiter } from "../lib/rate-limiters";

const router: IRouter = Router();

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

function getPublicDomain(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return domains.split(",")[0].trim();
  return process.env.REPLIT_DEV_DOMAIN ?? "localhost";
}

// ── Create payment ─────────────────────────────────────────────────────────
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
    res.status(500).json({ error: "Subscription plan not configured" });
    return;
  }

  const paymentToken = randomUUID();
  const domain = getPublicDomain();
  const frontendBase = `https://${domain}`;

  // Build checkout URL directly from the plan's init_point.
  // MP accepts external_reference and back_url as query params on the checkout URL.
  const checkoutUrl = [
    `https://www.mercadopago.com.ar/subscriptions/checkout`,
    `?preapproval_plan_id=${planId}`,
    `&external_reference=${paymentToken}`,
    `&back_url=${encodeURIComponent(`${frontendBase}/?bb_payment=success&token=${paymentToken}`)}`,
  ].join("");

  await db.insert(paymentsTable).values({
    paymentToken,
    userId,
    status: "pending",
    plan,
    amountArs,
    // mpPreapprovalId will be set later by the subscription_preapproval webhook
  });

  res.status(201).json({
    paymentToken,
    checkoutUrl,
    plan,
    amountArs,
  });
});

// ── Poll payment status ────────────────────────────────────────────────────
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

  // Fallback: if still pending, search MP by external_reference
  if (payment.status === "pending") {
    try {
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval/search?external_reference=${token}&limit=1`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      if (mpRes.ok) {
        const data = await mpRes.json() as {
          results?: Array<{ id: string; status: string }>;
        };
        const preapproval = data.results?.[0];
        if (preapproval) {
          if (preapproval.status === "authorized") {
            await db
              .update(paymentsTable)
              .set({ status: "approved", mpPreapprovalId: preapproval.id, updatedAt: new Date() })
              .where(eq(paymentsTable.paymentToken, token));
            res.json({ paymentToken: token, status: "approved", mpPaymentId: preapproval.id });
            return;
          } else if (preapproval.status === "cancelled") {
            await db
              .update(paymentsTable)
              .set({ status: "cancelled", mpPreapprovalId: preapproval.id, updatedAt: new Date() })
              .where(eq(paymentsTable.paymentToken, token));
            res.json({ paymentToken: token, status: "cancelled", mpPaymentId: preapproval.id });
            return;
          }
        }
      }
    } catch (e) {
      console.warn("[payments] MP search fallback failed:", e);
    }
  }

  res.json({
    paymentToken: token,
    status: payment.status,
    mpPaymentId: payment.mpPreapprovalId ?? payment.mpPaymentId ?? null,
  });
});

export default router;
