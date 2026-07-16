import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();

/**
 * DEV-ONLY: Simulate a Mercado Pago subscription approval.
 *
 * Accepts a paymentToken and marks the payment as "approved" in the DB,
 * bypassing the real MP checkout flow. Only active in development.
 */
router.post("/dev/approve-payment", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { token } = req.body as { token?: string };

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

  const fakePreapprovalId = `SIMULATED-${randomUUID()}`;

  await db
    .update(paymentsTable)
    .set({
      status: "approved",
      mpPreapprovalId: fakePreapprovalId,
      updatedAt: new Date(),
    })
    .where(eq(paymentsTable.paymentToken, token));

  console.log("[dev] payment approved:", token, "→", fakePreapprovalId);

  res.json({ ok: true, token, mpPreapprovalId: fakePreapprovalId });
});

export default router;
