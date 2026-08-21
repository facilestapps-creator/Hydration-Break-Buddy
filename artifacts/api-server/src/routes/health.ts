import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok-v2" });
  res.json(data);
});
router.get("/test/foo", (_req, res) => { res.json({ ping: "pong" }); });
export default router;
