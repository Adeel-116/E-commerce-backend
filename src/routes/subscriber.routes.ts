import { Router } from "express";
import { subscribeEmail } from "../controllers/subscriber.controller";

const router = Router();

router.post("/subscribe", subscribeEmail);

export default router;
