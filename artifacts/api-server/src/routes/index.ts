import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import teamsRouter from "./teams";
import breaksRouter from "./breaks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(teamsRouter);
router.use(breaksRouter);

export default router;
