const { Router } = require("express");
const {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  mergeCart,
  updateQuantity,
  updateCartItemSize,
} = require("../controllers/cart.controller");
const { protect } = require("../middleware/auth");
const { resolveCart } = require("../middleware/resolveCart");

const router = Router();

router.get("/cart", resolveCart, getCart);
router.post("/cart/add", resolveCart, addToCart);
router.post("/cart/updateSize", resolveCart, updateCartItemSize);
router.delete("/cart/remove", resolveCart, removeFromCart);
router.delete("/cart/clear", resolveCart, clearCart);
router.patch("/cart/quantity", resolveCart, updateQuantity);
router.post("/cart/merge", protect, mergeCart);

module.exports = router;
