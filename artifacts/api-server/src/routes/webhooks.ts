import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable, teamsTable, webhookEventsTable } from "@workspace/db";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createHmac } from "crypto";
import { getMpToken } from "../lib/mp-client";

const router: IRouter = Router();

router.post("/webhooks/mercadopago", async (req, res): Promise<void> => {
  const secret = process.env.MP_WEBHOOK_SECRET;

  // Fail closed in production: if no secret is configured, we cannot verify payload
  if (process.env.NODE_ENV === "production" && !secret) {
    res.status(200).json({ received: false, reason: "webhook secret not configured" });
    return;
  }

  // Always respond 200 immediately — MP retries on failure
  res.status(200).json({ received: true });

  try {
    const body = req.body as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
      id?: string | number;
      topic?: string;
    };

    // Determine event ID (used for HMAC and routing)
    const eventId = body.data?.id
      ? String(body.data.id)
      : body.id
      ? String(body.id)
      : undefined;

    if (!eventId) return;

    // HMAC signature verification when headers are present
    const xSignature = req.headers["x-signature"] as string | undefined;
    const xRequestId = req.headers["x-request-id"] as string | undefined;

    if (xSignature && xRequestId && secret) {
      const parts: Record<string, string> = {};
      for (const part of xSignature.split(",")) {
        const eqIdx = part.indexOf("=");
        if (eqIdx === -1) continue;
        const k = part.slice(0, eqIdx).trim();
        const v = part.slice(eqIdx + 1).trim();
        if (k && v) parts[k] = v;
      }
      const v1 = parts["v1"];
      if (!v1) return;

      const template = `id:${eventId};request-date:${xRequestId};`;
      const expected = createHmac("sha256", secret).update(template).digest("hex");
      if (v1 !== expected) return; // Bad signature — silently drop
    }

    // ── Route by event type ──────────────────────────────────────────────
// ── Idempotency guard ────────────────────────────────────────────────
    // MP retries webhook deliveries; process each distinct event only once.
    const eventType = body.type ?? body.topic;
    const dedupeKey = `${eventType ?? "unknown"}:${eventId}`;
    try {
      await db.insert(webhookEventsTable).values({ dedupeKey });
    } catch (err) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        // Unique violation — we've already processed this exact event.
        console.log("[webhook] duplicate event ignored:", dedupeKey);
        return;
      }
      throw err;
    }

    // ── Route by event type ──────────────────────────────────────────────

    if (eventType === "subscription_preapproval") {
      const preapprovalId = eventId;

      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: { Authorization: `Bearer ${getMpToken()}` },
      });
      if (!mpRes.ok) return;

      const preapproval = await mpRes.json() as {
        id: string;
        status: string;
        external_reference?: string;
      };

      // Update payment record if we have the external_reference (our paymentToken)
      if (preapproval.external_reference) {
        if (preapproval.status === "authorized") {
          await db
            .update(paymentsTable)
            .set({ status: "approved", mpPreapprovalId: preapprovalId, updatedAt: new Date() })
            .where(eq(paymentsTable.paymentToken, preapproval.external_reference));
        }
      }

      // Update team subscription status (if team already exists with this preapprovalId)
      const newSubStatus =
        preapproval.status === "authorized" ? "active"
        : preapproval.status === "paused" ? "paused"
        : preapproval.status === "cancelled" ? "cancelled"
        : null;

            if (newSubStatus) {
        const updateData: Record<string, unknown> = { subscriptionStatus: newSubStatus };
        if (newSubStatus === "active") {
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          updateData.currentPeriodEnd = periodEnd;
          // Payment recovered — clear the grace-period clock.
          updateData.pastDueSince = null;
        } else if (newSubStatus === "paused") {
          // Only stamp the clock the first time we see the failure — if MP
          // retries this same webhook, we must not reset the 24h countdown.
          const [team] = await db
            .select({ pastDueSince: teamsTable.pastDueSince })
            .from(teamsTable)
            .where(eq(teamsTable.mpPreapprovalId, preapprovalId));
          if (team && !team.pastDueSince) {
            updateData.pastDueSince = new Date();
          }
        }
        await db
          .update(teamsTable)
          .set(updateData)
          .where(eq(teamsTable.mpPreapprovalId, preapprovalId));
      }

      return;
    }

    // ── Subscription authorized payment (monthly renewal) ──
    if (eventType === "subscription_authorized_payment") {
      const authorizedPaymentId = eventId;

      // Fetch authorized payment details to get preapproval_id
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval_payment/${authorizedPaymentId}`,
        { headers: { Authorization: `Bearer ${getMpToken()}` } }
      );
      if (!mpRes.ok) {
        console.error("[webhook] Could not fetch preapproval_payment:", authorizedPaymentId);
        return;
      }

      const authorizedPayment = await mpRes.json() as {
        id: string;
        preapproval_id?: string;
        status: string;
        date_approved?: string;
      };

      if (authorizedPayment.preapproval_id && authorizedPayment.status === "processed") {
        const baseDate = authorizedPayment.date_approved
          ? new Date(authorizedPayment.date_approved)
          : new Date();
        const periodEnd = new Date(baseDate);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await db
          .update(teamsTable)
          .set({ subscriptionStatus: "active", currentPeriodEnd: periodEnd })
          .where(eq(teamsTable.mpPreapprovalId, authorizedPayment.preapproval_id));
      }

      return;
    }

    // ── One-time payment (legacy / IPN) ──
    let mpPaymentId: string | undefined;
    if ((body.type === "payment" || body.action?.startsWith("payment")) && body.data?.id) {
      mpPaymentId = String(body.data.id);
    } else if (body.topic === "payment" && body.id) {
      mpPaymentId = String(body.id);
    }

    if (!mpPaymentId) return;

    const mpClient = new MercadoPagoConfig({ accessToken: getMpToken() });
    const paymentApi = new Payment(mpClient);
    const mpPayment = await paymentApi.get({ id: mpPaymentId });

    const externalRef = mpPayment.external_reference;
    const rawStatus = mpPayment.status ?? "pending";
    const normalizedStatus = ["approved", "rejected", "cancelled"].includes(rawStatus)
      ? rawStatus
      : "pending";

    if (!externalRef) return;

    await db
      .update(paymentsTable)
      .set({ status: normalizedStatus, mpPaymentId, updatedAt: new Date() })
      .where(eq(paymentsTable.paymentToken, externalRef));

  } catch (err) {
    console.error("[webhook] processing error:", err);
  }
});

export default router;
