import { Router } from "express";
import { createCodOrder, getPaymentStatus, applyCoupon } from "../controllers/payment.controller";
import { resolveCart } from "../middleware/resolveCart";
import { validateStock } from "../middleware/validateStock";
import { createOrderLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/checkout/create-cod-order", createOrderLimiter, resolveCart, validateStock, createCodOrder);
router.get("/checkout/status/:orderId", getPaymentStatus);
router.post("/checkout/apply-coupon", resolveCart, applyCoupon);

export default router;
