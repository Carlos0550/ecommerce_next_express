import { Router } from "express";
import { healthRouter } from "./health";
import { userRouter } from "./user.routes";

const router = Router();


router.use(healthRouter);
router.use(userRouter);

export { router };
