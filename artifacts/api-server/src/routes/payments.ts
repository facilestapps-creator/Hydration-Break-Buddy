import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, paymentsTable } from "@workspace/db";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function getPublicDomain(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return domains.split(",")[0].trim();
  return process.env.REPLIT_DEV_DOMAIN ?? "localhost";
}

function getMPClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
    options: { timeout: 8000 },
  });
}

router.post("/payments/create", async (req, res): Promise<void> => {
  const { userId } = req.body as { userId?: unknown };
  if (typeof userId !== "number" || !Number.isInteger(userId)) {
    res.status(400).json({ error: "userId must be an integer" });
    return;
  }

  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (userRows.length === 0) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  const paymentToken = randomUUID();
  const amountArs = parseInt(process.env.MP_PRICE_ARS ?? "5500", 10);
  const domain = getPublicDomain();
  const frontendBase = `https://${domain}`;   // app lives at root (BASE_PATH="/")
  const apiBase = `https://${domain}/api`;

  const preference = new Preference(getMPClient());
  const result = await preference.create({
    body: {
      items: [
        {
          id: "break-buddy-team",
          title: "Break Buddy — Crear Equipo",
          description: "Acceso único para crear un equipo en Break Buddy",
          quantity: 1,
          unit_price: amountArs,
          currency_id: "ARS",
        },
      ],
      external_reference: paymentToken,
      back_urls: {
        success: `${frontendBase}/?bb_payment=success&token=${paymentToken}`,
        failure: `${frontendBase}/?bb_payment=failure&token=${paymentToken}`,
        pending: `${frontendBase}/?bb_payment=pending&token=${paymentToken}`,
      },
      auto_return: "approved",
      notification_url: `${apiBase}/webhooks/mercadopago`,
    },
  });

  await db.insert(paymentsTable).values({
    paymentToken,
    mpPreferenceId: result.id!,
    userId,
    status: "pending",
    amountArs,
  });

  res.status(201).json({
    paymentToken,
    checkoutUrl: result.init_point!,
    amountArs,
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
  res.json({
    paymentToken: payment.paymentToken,
    status: payment.status,
    mpPaymentId: payment.mpPaymentId ?? null,
  });
});

export default router;
