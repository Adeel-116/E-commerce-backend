const CartService = require("../services/cart.service");

const getCart = async (req, res) => {
  const cart = await CartService.getCart(req.cartOwner.ownerId);
  res.status(200).json({ success: true, cart });
};

const addToCart = async (req, res) => {
  const { ownerId, ownerType } = req.cartOwner;
  const { productId, size, color, quantity = 1 } = req.body;
  const message = await CartService.addToCart(ownerId, ownerType, productId, size, color, quantity);
  res.status(200).json({ success: true, message });
};

const updateCartItemSize = async (req, res) => {
  const { ownerId, ownerType } = req.cartOwner;
  const { productId, oldSize, newSize, color } = req.body;
  await CartService.updateCartItemSize(ownerId, ownerType, productId, oldSize, newSize, color);
  res.status(200).json({ success: true, message: "Cart size updated successfully" });
};

const removeFromCart = async (req, res) => {
  const { ownerId } = req.cartOwner;
  await CartService.removeFromCart(ownerId, req.query.productId, req.query.size, req.query.color);
  res.status(200).json({ success: true, message: "Item removed" });
};

const clearCart = async (req, res) => {
  await CartService.clearCart(req.cartOwner.ownerId);
  res.status(200).json({ success: true, message: "Cart cleared" });
};

const updateQuantity = async (req, res) => {
  const { ownerId } = req.cartOwner;
  const { productId, size, color, quantity } = req.body;

  await CartService.updateQuantity(ownerId, productId, size, color, quantity);
  res.status(200).json({ success: true, message: "Quantity updated" });
};

const mergeCart = async (req, res) => {
  const guestId =
    req.headers["x-guest-id"] ||
    req.cookies.guestId;

  if (!guestId) {
    return res.status(200).json({ success: true, message: "Nothing to merge" });
  }

  await CartService.mergeCarts(req.user.id, guestId);
  res.clearCookie("guestId");
  res.status(200).json({ success: true, message: "Cart merged" });
};

module.exports = {
  getCart,
  addToCart,
  updateCartItemSize,
  removeFromCart,
  clearCart,
  updateQuantity,
  mergeCart,
};
