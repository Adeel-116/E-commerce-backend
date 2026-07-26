const mongoose = require("mongoose");
const { Cart } = require("../models/AddtoCartModel");
const Product = require("../models/ProductModel");
const { AppError } = require("../utils/AppError");
const { resolveDiscounts } = require("./discount.service");
const { applyBundlePricing } = require("./bundle.service");

// A cart line is uniquely identified by (productId, size, color) — normalize
// missing color to null so "no color selected" always compares consistently.
const normalizeColor = (color) => color ?? null;
const sameLine = (a, b) =>
  a.size === b.size && normalizeColor(a.color) === normalizeColor(b.color);

const getOrCreateCart = async (ownerId, ownerType) => {
  let cart = await Cart.findOne({ ownerId });
  if (!cart) {
    cart = await Cart.create({
      ownerId,
      ownerType,
      items: [],
      expiresAt:
        ownerType === "guest" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
    });
  }
  return cart;
};

const getCart = async (ownerId) => {

  const cart = await Cart.findOne({ ownerId }).populate(
    "items.productId",
    "title images price stock slug"
  );

  const emptyPricing = {
    subtotal: 0,
    discountSavings: 0,
    afterDiscountSubtotal: 0,
    bundleSavings: 0,
    total: 0,
  };

  if (!cart || cart.items.length === 0) {
    return { _id: cart?._id, items: [], pricing: emptyPricing, appliedBundles: [], appliedDiscounts: [] };
  }
  const items = cart.items.filter(
    (item) => item.productId != null
  );

  if (items.length === 0) {
    return { _id: cart._id, items: [], pricing: emptyPricing, appliedBundles: [], appliedDiscounts: [] };
  }

  const rawCartItems = items.map((item) => ({
    productId: item.productId._id.toString(),
    size: item.size,
    color: item.color ?? null,
    price: item.productId.price ?? 0,
    quantity: item.quantity,
  }));

  const subtotal = parseFloat(
    rawCartItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)
  );

  const {
    discountedSubtotal: afterDiscountSubtotal,
    totalDiscount: discountSavings,
    appliedDiscounts,
    lineItems,
  } = await resolveDiscounts(rawCartItems);

  const discountedCartItems = lineItems.map((li) => ({
    productId: li.productId,
    size: li.size,
    color: li.color ?? null,
    price: parseFloat((li.subtotal / li.quantity).toFixed(4)),
    quantity: li.quantity,
  }));

  // 2. Bundle savings are subtracted from the already-discounted amount.
  const { items: cartItems, appliedBundles, totalBundleSavings: bundleSavings } =
    await applyBundlePricing(discountedCartItems);

  const total = parseFloat((afterDiscountSubtotal - bundleSavings).toFixed(2));

  const itemsWithPricing = items.map((item, index) => {
    const originalPrice = rawCartItems[index].price;
    const finalPrice = cartItems.find(
      (c) => c.productId === item.productId._id.toString() && sameLine(c, item)
    ).price;
    const activeDiscount =
      lineItems.find(
        (li) => li.productId === item.productId._id.toString() && sameLine(li, item)
      )?.discount ?? null;
    return {
      productId: item.productId,
      size: item.size,
      color: item.color ?? null,
      quantity: item.quantity,
      originalPrice,
      bundleApplied: finalPrice < originalPrice - 0.01,
      activeDiscount,
    };
  });

  return {
    _id: cart._id,
    items: itemsWithPricing,
    pricing: {
      subtotal,
      discountSavings,
      afterDiscountSubtotal,
      bundleSavings,
      total,
    },
    appliedBundles,
    appliedDiscounts,
  };
};

const addToCart = async (
  ownerId,
  ownerType,
  productId,
  size,
  color,
  quantity = 1
) => {
  if (!productId || !size) throw new AppError("productId and size are required", 400);
  const product = await Product.findById(productId).lean();
  if (!product) throw new AppError("Product not found", 404);
  if (!product.stock) throw new AppError("Product is out of stock", 400);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError("Invalid quantity", 400);
  }

  const cart = await getOrCreateCart(ownerId, ownerType);
  const existing = cart.items.find(
    (item) => item.productId.toString() === productId && sameLine(item, { size, color })
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      productId: new mongoose.Types.ObjectId(productId),
      size,
      color: normalizeColor(color),
      quantity,
    });
  }

  await cart.save();
  return "Item added to cart";
};

const updateCartItemSize = async (
  ownerId,
  _ownerType,
  productId,
  oldSize,
  newSize,
  color
) => {
  const cart = await Cart.findOne({ ownerId });
  if (!cart) throw new AppError("Cart not found", 404);

  const items = cart.items;

  const oldItem = items.find(
    (i) => i.productId.toString() === productId && sameLine(i, { size: oldSize, color })
  );
  if (!oldItem) throw new AppError("Item not found in cart", 404);

  const newItem = items.find(
    (i) => i.productId.toString() === productId && sameLine(i, { size: newSize, color })
  );
  if (newItem) {
    newItem.quantity += oldItem.quantity;
    cart.items.splice(
      cart.items.indexOf(oldItem),
      1
    );
  } else {
    oldItem.size = newSize;
  }

  await cart.save();
};

const removeFromCart = async (
  ownerId,
  productId,
  size,
  color
) => {
  const pull = { productId };
  if (size) pull.size = size;
  if (color) pull.color = color;
  await Cart.updateOne({ ownerId }, { $pull: { items: pull } });
};

const clearCart = async (ownerId) => {
  await Cart.updateOne({ ownerId }, { $set: { items: [] } });
};

const updateQuantity = async (
  ownerId,
  productId,
  size,
  color,
  quantity
) => {
  if (quantity < 1) throw new AppError("Quantity must be at least 1", 400);
  const cart = await Cart.findOne({ ownerId });
  if (!cart) throw new AppError("Cart not found", 404);

  const item = cart.items.find(
    (i) => i.productId.toString() === productId && sameLine(i, { size, color })
  );
  if (!item) throw new AppError("Item not found in cart", 404);

  item.quantity = quantity;
  await cart.save();
};

const mergeCarts = async (userId, guestId) => {
  const [userCart, guestCart] = await Promise.all([
    Cart.findOne({ ownerId: userId }),
    Cart.findOne({ ownerId: guestId }),
  ]);

  if (!guestCart || guestCart.items.length === 0) return;

  const guestProductIds = guestCart.items.map((item) => item.productId);
  const inStockProducts = await Product.find({
    _id: { $in: guestProductIds },
    stock: true,
  }).lean();
  const inStockIds = new Set(inStockProducts.map((p) => p._id.toString()));

  const validGuestItems = guestCart.items.filter((item) =>
    inStockIds.has(item.productId.toString())
  );

  if (!userCart) {
    await Cart.create({
      ownerId: userId,
      ownerType: "user",
      items: validGuestItems,
      expiresAt: null,
    });
  } else {
    for (const guestItem of validGuestItems) {
      const existing = userCart.items.find(
        (i) => i.productId.toString() === guestItem.productId.toString() && sameLine(i, guestItem)
      );
      if (existing) {
        existing.quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem);
      }
    }
    await userCart.save();
  }

  await Cart.deleteOne({ ownerId: guestId });
};

module.exports = {
  getCart,
  addToCart,
  updateCartItemSize,
  removeFromCart,
  clearCart,
  updateQuantity,
  mergeCarts,
};
