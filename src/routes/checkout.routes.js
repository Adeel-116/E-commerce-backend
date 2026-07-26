const { Router } = require("express");
const { createCodOrder, getPaymentStatus, applyCoupon } = require("../controllers/payment.controller");
const { resolveCart } = require("../middleware/resolveCart");
const { validateStock } = require("../middleware/validateStock");
const { createOrderLimiter } = require("../middleware/rateLimit");

const router = Router();

router.post("/checkout/create-cod-order", createOrderLimiter, resolveCart, validateStock, createCodOrder);
router.get("/checkout/status/:orderId", getPaymentStatus);
router.post("/checkout/apply-coupon", resolveCart, applyCoupon);

module.exports = router;
