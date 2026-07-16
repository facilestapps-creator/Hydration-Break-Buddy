import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable } from "@workspace/db";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createHmac } from "crypto";

const router: IRouter = Router();

router.post("/webhooks/mercadopago", async (req, res): Promise<void> => {
  const secret = process.env.MP_WEBHOOK_SECRET;

  // Fail closed in production: if no secret is configured, we cannot verify
  // the payload authenticity — reject silently rather than process unverified data.
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

    // Support both new format { type, data.id } and old IPN format { topic, id }
    let mpPaymentId: string | undefined;
    if ((body.type === "payment" || body.action?.startsWith("payment")) && body.data?.id) {
      mpPaymentId = String(body.data.id);
    } else if (body.topic === "payment" && body.id) {
      mpPaymentId = String(body.id);
    }

    if (!mpPaymentId) {
      return;
    }

    // Verify HMAC signature when MP sends one (dashboard-registered webhooks).
    // IPN notifications (sent via notification_url in preference) do NOT include
    // x-signature / x-request-id — they are validated by fetching from the MP API below.
    const xSignature = req.headers["x-signature"] as string | undefined;
    const xRequestId = req.headers["x-request-id"] as string | undefined;

    if (xSignature && xRequestId) {
      // Headers present — signature verification is mandatory if we have a secret
      if (secret) {
        const parts: Record<string, string> = {};
        for (const part of xSignature.split(",")) {
          const eqIdx = part.indexOf("=");
          if (eqIdx === -1) continue;
          const k = part.slice(0, eqIdx).trim();
          const v = part.slice(eqIdx + 1).trim();
          if (k && v) parts[k] = v;
        }
        const v1 = parts["v1"];
        if (!v1) return; // Malformed signature header

        // MP's manifest format: id:{data.id};request-date:{x-request-id};
        const template = `id:${mpPaymentId};request-date:${xRequestId};`;
        const expected = createHmac("sha256", secret).update(template).digest("hex");
        if (v1 !== expected) return; // Bad signature — silently drop
      }
      // If no secret configured in development, allow through (real MP details verified below)
    }
    // If no signature headers: IPN mode — proceed; MP API call below confirms legitimacy

    // Fetch full payment details from MP API
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });
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
      .set({
        status: normalizedStatus,
        mpPaymentId,
        updatedAt: new Date(),
      })
      .where(eq(paymentsTable.paymentToken, externalRef));
  } catch (err) {
    // Already responded 200; log error for debugging without triggering MP retry storm
    console.error("[webhook] processing error:", err);
  }
});

export default router;
