import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * Public configuration values the frontend needs at runtime.
 * Only expose non-sensitive values here — MP_PUBLIC_KEY is safe (it is public by design).
 */
router.get("/config", (_req, res) => {
  res.json({
    mpPublicKey: process.env.MP_PUBLIC_KEY ?? null,
  });
});

export default router;
