import mongoose from "mongoose";
import { Cart } from "../models/AddtoCartModel";
import Product from "../models/ProductModel";
import { AppError } from "../utils/AppError";
import { resolveDiscounts, type CartItem, type LineItemDiscount } from "./discount.service";
import { applyBundlePricing } from "./bundle.service";

// A cart line is uniquely identified by (productId, size, color) — normalize
// missing color to null so "no color selected" always compares consistently.
const normalizeColor = (color?: string | null) => color ?? null;
const sameLine = (a: { size: string; color?: string | null }, b: { size: string; color?: string | null }) =>
  a.size === b.size && normalizeColor(a.color) === normalizeColor(b.color);

const getOrCreateCart = async (ownerId: string, ownerType: "user" | "guest") => {
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

type PopulatedItem = {
  productId: {
    _id: mongoose.Types.ObjectId;
    title: string;
    images: string[];
    price: number;
    stock: boolean;
    slug: string;
  };
  size: string;
  color?: string | null;
  quantity: number;
};

export const getCart = async (ownerId: string) => {

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
  const items = (cart.items as unknown as PopulatedItem[]).filter(
    (item) => item.productId != null
  );

  if (items.length === 0) {
    return { _id: cart._id, items: [], pricing: emptyPricing, appliedBundles: [], appliedDiscounts: [] };
  }

  const rawCartItems: CartItem[] = items.map((item) => ({
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

  const discountedCartItems: CartItem[] = lineItems.map((li) => ({
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
    )!.price;
    const activeDiscount: LineItemDiscount | null =
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

export const addToCart = async (
  ownerId: string,
  ownerType: "user" | "guest",
  productId: string,
  size: string,
  color: string | null | undefined,
  quantity: number = 1
) => {
  if (!productId || !size) throw new AppError("productId and size are required", 400);
  const product = await Product.findById(productId).lean();
  if (!product) throw new AppError("Product not found", 404);
  if (!product.stock) throw new AppError("Product is out of stock", 400);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError("Invalid quantity", 400);
  }

  const cart = await getOrCreateCart(ownerId, ownerType);
  type RawItem = { productId: mongoose.Types.ObjectId; size: string; color?: string | null; quantity: number };
  const existing = cart.items.find(
    (item: RawItem) => item.productId.toString() === productId && sameLine(item, { size, color })
  ) as RawItem | undefined;

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      productId: new mongoose.Types.ObjectId(productId),
      size,
      color: normalizeColor(color),
      quantity,
    } as unknown as (typeof cart.items)[number]);
  }

  await cart.save();
  return "Item added to cart";
};

export const updateCartItemSize = async (
  ownerId: string,
  _ownerType: "user" | "guest",
  productId: string,
  oldSize: string,
  newSize: string,
  color: string | null | undefined
) => {
  const cart = await Cart.findOne({ ownerId });
  if (!cart) throw new AppError("Cart not found", 404);

  type CartItem = { productId: mongoose.Types.ObjectId; size: string; color?: string | null; quantity: number };
  const items = cart.items as unknown as CartItem[];

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
      cart.items.indexOf(oldItem as unknown as (typeof cart.items)[number]),
      1
    );
  } else {
    oldItem.size = newSize;
  }

  await cart.save();
};

export const removeFromCart = async (
  ownerId: string,
  productId: string,
  size?: string,
  color?: string | null
) => {
  const pull: Record<string, unknown> = { productId };
  if (size) pull.size = size;
  if (color) pull.color = color;
  await Cart.updateOne({ ownerId }, { $pull: { items: pull } });
};

export const clearCart = async (ownerId: string) => {
  await Cart.updateOne({ ownerId }, { $set: { items: [] } });
};

export const updateQuantity = async (
  ownerId: string,
  productId: string,
  size: string,
  color: string | null | undefined,
  quantity: number
) => {
  if (quantity < 1) throw new AppError("Quantity must be at least 1", 400);
  const cart = await Cart.findOne({ ownerId });
  if (!cart) throw new AppError("Cart not found", 404);

  type CartItem = { productId: mongoose.Types.ObjectId; size: string; color?: string | null; quantity: number };
  const item = (cart.items as unknown as CartItem[]).find(
    (i) => i.productId.toString() === productId && sameLine(i, { size, color })
  );
  if (!item) throw new AppError("Item not found in cart", 404);

  item.quantity = quantity;
  await cart.save();
};

export const mergeCarts = async (userId: string, guestId: string) => {
  const [userCart, guestCart] = await Promise.all([
    Cart.findOne({ ownerId: userId }),
    Cart.findOne({ ownerId: guestId }),
  ]);

  if (!guestCart || guestCart.items.length === 0) return;

  type RawItem = { productId: mongoose.Types.ObjectId; size: string; color?: string | null; quantity: number };
  const guestProductIds = guestCart.items.map((item: RawItem) => item.productId);
  const inStockProducts = await Product.find({
    _id: { $in: guestProductIds },
    stock: true,
  }).lean();
  const inStockIds = new Set(inStockProducts.map((p) => p._id.toString()));

  const validGuestItems = (guestCart.items as unknown as RawItem[]).filter((item) =>
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
      const existing = (userCart.items as unknown as RawItem[]).find(
        (i) => i.productId.toString() === guestItem.productId.toString() && sameLine(i, guestItem)
      );
      if (existing) {
        existing.quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem as unknown as (typeof userCart.items)[number]);
      }
    }
    await userCart.save();
  }

  await Cart.deleteOne({ ownerId: guestId });
};
