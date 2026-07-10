import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable } from "@workspace/db";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createHmac } from "crypto";

const router: IRouter = Router();

router.post("/webhooks/mercadopago", async (req, res): Promise<void> => {
  // Always respond 200 immediately — MP retries on failure
  res.status(200).json({ received: true });

  try {
    const body = req.body as {
      type?: string;
      data?: { id?: string | number };
    };

    if (body.type !== "payment" || !body.data?.id) return;

    const mpPaymentId = String(body.data.id);

    // Verify HMAC signature — mandatory when MP_WEBHOOK_SECRET is configured
    const xSignature = req.headers["x-signature"] as string | undefined;
    const xRequestId = req.headers["x-request-id"] as string | undefined;
    const secret = process.env.MP_WEBHOOK_SECRET;

    if (secret) {
      // Reject outright if headers are missing
      if (!xSignature || !xRequestId) return;

      const parts: Record<string, string> = {};
      for (const part of xSignature.split(",")) {
        const eqIdx = part.indexOf("=");
        if (eqIdx === -1) continue;
        const k = part.slice(0, eqIdx).trim();
        const v = part.slice(eqIdx + 1).trim();
        if (k && v) parts[k] = v;
      }
      const v1 = parts["v1"];
      // Reject if the v1 signature component is absent
      if (!v1) return;

      // MP's manifest format: id:{data.id};request-date:{x-request-id};
      const template = `id:${mpPaymentId};request-date:${xRequestId};`;
      const expected = createHmac("sha256", secret).update(template).digest("hex");
      if (v1 !== expected) return; // Bad signature — silently drop
    }

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
  } catch {
    // Already responded 200; log swallowed to avoid MP retry storm
  }
});

export default router;
