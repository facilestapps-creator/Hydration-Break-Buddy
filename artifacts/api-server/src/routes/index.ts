import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import teamsRouter from "./teams";
import breaksRouter from "./breaks";
import paymentsRouter from "./payments";
import webhooksRouter from "./webhooks";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(usersRouter);
router.use(teamsRouter);
router.use(breaksRouter);
router.use(paymentsRouter);
router.use(webhooksRouter);

export default router;
