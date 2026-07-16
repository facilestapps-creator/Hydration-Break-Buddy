import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, paymentsTable } from "@workspace/db";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/auth";
import { strictLimiter } from "../lib/rate-limiters";

const router: IRouter = Router();

function getPublicDomain(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return domains.split(",")[0].trim();
  return process.env.REPLIT_DEV_DOMAIN ?? "localhost";
}

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

  const planId =
    plan === "company"
      ? process.env.MP_PREAPPROVAL_PLAN_ID_COMPANY!
      : process.env.MP_PREAPPROVAL_PLAN_ID_TEAM!;

  if (!planId) {
    res.status(500).json({ error: "Subscription plan not configured" });
    return;
  }

  const paymentToken = randomUUID();
  const domain = getPublicDomain();
  const frontendBase = `https://${domain}`;

  // Create subscription via MP PreApproval API
  const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preapproval_plan_id: planId,
      external_reference: paymentToken,
      back_url: `${frontendBase}/?bb_payment=success&token=${paymentToken}`,
    }),
  });

  if (!mpRes.ok) {
    const errorText = await mpRes.text();
    console.error("[payments] MP preapproval creation failed:", errorText);
    res.status(502).json({ error: "Could not create subscription with Mercado Pago" });
    return;
  }

  const mpData = await mpRes.json() as { id: string; init_point: string; status?: string };

  await db.insert(paymentsTable).values({
    paymentToken,
    mpPreapprovalId: mpData.id,
    userId,
    status: "pending",
    plan,
    amountArs: 0, // price is defined in the MP plan
  });

  res.status(201).json({
    paymentToken,
    checkoutUrl: mpData.init_point,
    plan,
    amountArs: 0,
  });
});

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

  // Fallback: if still pending, query MP directly (subscription preapproval)
  if (payment.status === "pending" && payment.mpPreapprovalId) {
    try {
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval/${payment.mpPreapprovalId}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      if (mpRes.ok) {
        const data = await mpRes.json() as { id: string; status: string };
        if (data.status === "authorized") {
          await db
            .update(paymentsTable)
            .set({ status: "approved", updatedAt: new Date() })
            .where(eq(paymentsTable.paymentToken, token));
          res.json({ paymentToken: token, status: "approved", mpPaymentId: payment.mpPreapprovalId });
          return;
        } else if (data.status === "cancelled") {
          await db
            .update(paymentsTable)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(paymentsTable.paymentToken, token));
          res.json({ paymentToken: token, status: "cancelled", mpPaymentId: null });
          return;
        }
      }
    } catch (err) {
      console.error("[status] MP preapproval fallback check failed:", err);
    }
  }

  res.json({
    paymentToken: payment.paymentToken,
    status: payment.status,
    mpPaymentId: payment.mpPaymentId ?? payment.mpPreapprovalId ?? null,
  });
});

export default router;
