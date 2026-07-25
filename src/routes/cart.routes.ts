import { Router } from "express";
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  mergeCart,
  updateQuantity,
  updateCartItemSize,
} from "../controllers/cart.controller";
import { protect } from "../middleware/auth";
import { resolveCart } from "../middleware/resolveCart";

const router = Router();

router.get("/cart", resolveCart, getCart);
router.post("/cart/add", resolveCart, addToCart);
router.post("/cart/updateSize", resolveCart, updateCartItemSize);
router.delete("/cart/remove", resolveCart, removeFromCart);
router.delete("/cart/clear", resolveCart, clearCart);
router.patch("/cart/quantity", resolveCart, updateQuantity);
router.post("/cart/merge", protect, mergeCart);

export default router;
