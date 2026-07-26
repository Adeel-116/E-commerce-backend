const { Cart } = require("../models/AddtoCartModel");
const { OrderModel } = require("../models/OrderModel");
const {
  resolveDiscounts,
  recordDiscountUsages,
  recordCustomerFirstOrder,
  validateCoupon,
} = require("../services/discount.service");
const { applyBundlePricing } = require("../services/bundle.service");
const { calculateShipping } = require("../services/shipping.service");
const { generateOrderId } = require("../utils/generateOrderId");
const { User } = require("../models/UserModel");

const normalizeColor = (color) => color ?? null;

async function resolveOrderEmail(
  guestEmail,
  shippingEmail,
  userId
) {
  if (guestEmail) return guestEmail;
  if (shippingEmail) return shippingEmail;
  if (userId) {
    const user = await User.findById(userId).select("email");
    return user?.email;
  }
  return undefined;
}

const createCodOrder = async (req, res) => {
  try {
    const { ownerId, ownerType } = req.cartOwner;
    const isAuthenticated = ownerType === "user";
    const userId = isAuthenticated ? ownerId : undefined;
    const { shippingAddress, guestEmail, couponCode } = req.body;

    if (!isAuthenticated && !guestEmail) {
      return res.status(400).json({ success: false, message: "Email is required for guest checkout" });
    }

    const requiredAddressFields = ["fullName", "line1", "city", "state", "postalCode", "country", "phone"];
    for (const field of requiredAddressFields) {
      if (!shippingAddress?.[field]) {
        return res.status(400).json({ success: false, message: `shippingAddress.${field} is required` });
      }
    }

    const cart = await Cart.findOne({ ownerId }).populate("items.productId", "title images price stock");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: "EMPTY_CART" });
    }

    // Items whose product was deleted resolve to a null productId after populate.
    const validCartItems = cart.items.filter((item) => item.productId != null);
    if (validCartItems.length === 0) {
      return res.status(400).json({ success: false, error: "EMPTY_CART" });
    }

    const cartItems = [];
    let rawSubtotal = 0;

    for (const item of validCartItems) {
      const product = item.productId;
      const size = item.size;
      const color = item.color ?? null;
      const price = product.price ?? 0;
      const quantity = item.quantity ?? 1;
      rawSubtotal += price * quantity;
      cartItems.push({ productId: product._id.toString(), size, color, price, quantity });
    }
    rawSubtotal = parseFloat(rawSubtotal.toFixed(2));

    // 1. Product/global discounts apply first, on the catalog price.
    const { appliedDiscounts: productDiscounts, lineItems: discountedLineItems, totalDiscount: discountSavings } =
      await resolveDiscounts(cartItems);
    const discountedCartItems = discountedLineItems.map((li) => ({
      productId: li.productId,
      size: li.size,
      color: li.color ?? null,
      price: parseFloat((li.subtotal / li.quantity).toFixed(4)),
      quantity: li.quantity,
    }));

    // 2. Bundle savings are subtracted from the already-discounted amount.
    const { items: bundledCartItems, totalBundleSavings: bundleSavings } =
      await applyBundlePricing(discountedCartItems);
    const afterBundleSubtotal = parseFloat(
      (bundledCartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)).toFixed(2)
    );

    const customerEmail = await resolveOrderEmail(guestEmail, shippingAddress?.email, userId);

    let couponSavings = 0;
    let couponDiscount;
    if (couponCode) {
      const { coupon, summary } = await validateCoupon(couponCode, afterBundleSubtotal, customerEmail);
      couponSavings = summary.discount;
      couponDiscount = {
        discountId: coupon._id.toString(),
        name: coupon.name,
        type: "coupon",
        code: coupon.code ?? undefined,
        couponType: coupon.couponType ?? undefined,
        valueType: coupon.valueType,
        value: coupon.value,
        amountSaved: couponSavings,
      };
    }

    const discountedSubtotal = parseFloat((afterBundleSubtotal - couponSavings).toFixed(2));
    const totalDiscount = parseFloat((discountSavings + couponSavings).toFixed(2));
    const appliedDiscounts = couponDiscount ? [...productDiscounts, couponDiscount] : productDiscounts;

    const lineItems = bundledCartItems.map((ci) => ({
      ...ci,
      subtotal: parseFloat((ci.price * ci.quantity).toFixed(2)),
    }));

    const { cost: shippingCost } = calculateShipping(rawSubtotal);
    const total = parseFloat((discountedSubtotal + shippingCost).toFixed(2));
    const totalOrdersDB = await OrderModel.countDocuments();

    const orderId = await generateOrderId(totalOrdersDB);

    const orderItems = lineItems.map((li) => {
      const product = validCartItems.find(
        (i) =>
          i.productId._id.toString() === li.productId &&
          i.size === li.size &&
          normalizeColor(i.color) === normalizeColor(li.color)
      )?.productId;
      return {
        productId: li.productId,
        title: product?.title ?? "",
        image: product?.images?.[0] ?? "",
        size: li.size,
        color: li.color ?? null,
        price: li.price,
        originalPrice: product?.price ?? li.price,
        quantity: li.quantity,
        subtotal: li.subtotal,
      };
    });

    const order = await OrderModel.create({
      orderId,
      ...(userId ? { userId } : {}),
      ...(guestEmail ? { guestEmail } : {}),
      cartOwnerId: ownerId,
      items: orderItems,
      pricing: { subtotal: rawSubtotal, shipping: shippingCost, discount: totalDiscount, bundleSavings, total },
      appliedDiscounts,
      shippingAddress,
      payment: { method: "cod", status: "pending" },
      status: "processing",
    });

    await recordDiscountUsages(appliedDiscounts, customerEmail);
    if (customerEmail) {
      const isFirstOrder = await recordCustomerFirstOrder(customerEmail, order._id.toString());
      if (isFirstOrder) await OrderModel.updateOne({ _id: order._id }, { $set: { isFirstOrder: true } });
    }
    await Cart.updateOne({ ownerId }, { $set: { items: [] } });

    return res.status(201).json({ success: true, orderId, total });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error("createCodOrder error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const order = await OrderModel.findOne(
      { orderId: req.params.orderId },
      "orderId status payment.status payment.paidAt pricing.total"
    );
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    return res.status(200).json({
      success: true,
      orderId: order.orderId,
      orderStatus: order.status,
      paymentStatus: order.payment.status,
      paidAt: order.payment.paidAt,
      total: order.pricing.total,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { code, subtotal, email } = req.body;

    if (!code || subtotal === undefined) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and subtotal are required.",
      });
    }

    const customerEmail = await resolveOrderEmail(
      email,
      undefined,
      req.cartOwner?.ownerType === "user" ? req.cartOwner.ownerId : undefined
    );

    const { coupon, summary } = await validateCoupon(code, subtotal, customerEmail);

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      coupon: {
        id: coupon._id,
        name: coupon.name,
        code: coupon.code,
        valueType: coupon.valueType,
        value: coupon.value,
      },
      summary,
    });
  } catch (err) {
    return res.status(err?.statusCode ?? 400).json({
      success: false,
      message: err?.message ?? "Invalid coupon",
    });
  }
};

module.exports = {
  createCodOrder,
  getPaymentStatus,
  applyCoupon,
};
