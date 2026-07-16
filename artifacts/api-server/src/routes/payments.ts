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

// ── Create subscription via MP POST /preapproval ───────────────────────────
//
// The frontend tokenizes the card with MP.js Secure Fields (PCI-compliant —
// the card number never reaches our server) and sends us the one-time
// card_token_id together with payer_email.  We forward it to MP's
// POST /preapproval endpoint, which creates the subscription and returns
// an authoritative preapproval object we can immediately trust.
//
// Flow:
//   status === "authorized" → payment marked approved; user goes to name-team step
//   status === "pending"    → needs 3DS or extra auth; redirect to init_point
//
router.post("/payments/create", requireAuth, strictLimiter, async (req, res): Promise<void> => {
  const userId = req.userId;

  const { plan, cardTokenId, payerEmail } = req.body as {
    plan?: unknown;
    cardTokenId?: unknown;
    payerEmail?: unknown;
  };

  if (plan !== "team" && plan !== "company") {
    res.status(400).json({ error: "plan must be 'team' or 'company'" });
    return;
  }
  if (typeof cardTokenId !== "string" || !cardTokenId.trim()) {
    res.status(400).json({ error: "cardTokenId is required" });
    return;
  }
  if (typeof payerEmail !== "string" || !payerEmail.includes("@")) {
    res.status(400).json({ error: "payerEmail must be a valid email" });
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
  const domain = getPublicDomain();
  const frontendBase = `https://${domain}`;

  // ── Call MP POST /preapproval ──────────────────────────────────────────
  const mpBody = {
    preapproval_plan_id: planId,
    card_token_id: cardTokenId,
    payer_email: payerEmail,
    external_reference: paymentToken,
    back_url: `${frontendBase}/?bb_payment=success&token=${paymentToken}`,
  };
  console.log("[payments] POST /preapproval body:", JSON.stringify({
    ...mpBody,
    card_token_id: cardTokenId.slice(0, 8) + "…",  // truncate for log safety
  }));

  const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(mpBody),
  });

  const preapproval = await mpRes.json() as {
    id?: string;
    status?: string;
    init_point?: string;
    message?: string;
    error?: string;
    cause?: Array<{ code: string; description: string }>;
  };

  if (!mpRes.ok) {
    console.error("[payments] MP /preapproval error (HTTP", mpRes.status, "):", JSON.stringify(preapproval));
    res.status(502).json({
      error: "Payment provider error",
      detail: preapproval.message ?? preapproval.error ?? "Unknown MP error",
      cause: preapproval.cause ?? [],
    });
    return;
  }

  const mpPreapprovalId = preapproval.id ?? null;
  // MP returns "authorized" when the subscription is active; treat that as approved.
  const dbStatus = preapproval.status === "authorized" ? "approved" : "pending";

  // ── Persist to DB ─────────────────────────────────────────────────────
  await db.insert(paymentsTable).values({
    paymentToken,
    userId,
    status: dbStatus,
    plan,
    amountArs,
    mpPreapprovalId,
  });

  if (dbStatus === "approved") {
    res.status(201).json({
      paymentToken,
      plan,
      amountArs,
      status: "approved",
    });
  } else {
    res.status(201).json({
      paymentToken,
      plan,
      amountArs,
      status: "pending",
      checkoutUrl: preapproval.init_point ?? null,
    });
  }
});

// ── Poll payment status ────────────────────────────────────────────────────
// Used as a fallback when the subscription goes through a 3DS redirect and
// the webhook hasn't fired yet by the time the user returns.
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

  // Fallback: if still pending and we already know the preapproval ID, fetch it directly
  if (payment.status === "pending" && payment.mpPreapprovalId) {
    try {
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval/${payment.mpPreapprovalId}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      if (mpRes.ok) {
        const preapproval = await mpRes.json() as { id: string; status: string };
        if (preapproval.status === "authorized") {
          await db
            .update(paymentsTable)
            .set({ status: "approved", updatedAt: new Date() })
            .where(eq(paymentsTable.paymentToken, token));
          res.json({ paymentToken: token, status: "approved", mpPaymentId: preapproval.id });
          return;
        } else if (preapproval.status === "cancelled") {
          await db
            .update(paymentsTable)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(paymentsTable.paymentToken, token));
          res.json({ paymentToken: token, status: "cancelled", mpPaymentId: preapproval.id });
          return;
        }
      }
    } catch (e) {
      console.warn("[payments] MP preapproval fetch failed:", e);
    }
  }

  res.json({
    paymentToken: token,
    status: payment.status,
    mpPaymentId: payment.mpPreapprovalId ?? payment.mpPaymentId ?? null,
  });
});

export default router;
