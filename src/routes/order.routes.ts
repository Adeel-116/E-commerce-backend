import { Router } from "express";
import { getOrderHistory, getOrderById } from "../controllers/order.controller";
import { protect } from "../middleware/auth";

const router = Router();

router.get("/orders", protect, getOrderHistory);
router.get("/orders/:orderId", protect, getOrderById);

export default router;
