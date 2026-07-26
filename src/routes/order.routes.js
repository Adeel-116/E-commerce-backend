const { Router } = require("express");
const { getOrderHistory, getOrderById } = require("../controllers/order.controller");
const { protect } = require("../middleware/auth");

const router = Router();

router.get("/orders", protect, getOrderHistory);
router.get("/orders/:orderId", protect, getOrderById);

module.exports = router;
