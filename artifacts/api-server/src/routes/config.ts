import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * Public configuration values the frontend needs at runtime.
 * Only expose non-sensitive values here — MP_PUBLIC_KEY is safe (it is public by design).
 */
router.get("/config", (_req, res) => {
  const freeLaunchUntil = process.env.LAUNCH_FREE_UNTIL ?? null;
  const freeLaunchActive =
    !!freeLaunchUntil && Date.now() < new Date(freeLaunchUntil).getTime();
  res.json({
    mpPublicKey: process.env.MP_PUBLIC_KEY ?? null,
    freeLaunchActive,
    freeLaunchUntil,
  });
});

export default router;
