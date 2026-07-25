import { Discount } from "../models/DiscountModel";
import { RewardCouponUsage } from "../models/RewardCoupanUsage";
import { Customer } from "../models/CustomerModel";
import { AppError } from "../utils/AppError";
import type { CreateDiscountInput } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CartItem = {
  productId: string;
  size: string;
  color?: string | null;
  price: number;
  quantity: number;
};

export type AppliedDiscount = {
  discountId: string;
  name: string;
  type: "coupon" | "product" | "all_products";
  code?: string;
  couponType?: "general" | "reward";
  valueType: "percentage" | "fixed";
  value: number;
  amountSaved: number;
};

export type LineItemDiscount = {
  discountId: string;
  name: string;
  type: "product" | "all_products";
  valueType: "percentage" | "fixed";
  value: number;
  amountSaved: number;
};

export type ResolveResult = {
  discountedSubtotal: number;
  totalDiscount: number;
  appliedDiscounts: AppliedDiscount[];
  lineItems: {
    productId: string;
    size: string;
    color?: string | null;
    price: number;
    quantity: number;
    subtotal: number;
    discount: LineItemDiscount | null;
  }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const applyValue = (amount: number, valueType: "percentage" | "fixed", value: number): number => {
  const discount = valueType === "percentage" ? (amount * value) / 100 : value;
  return Math.round(Math.min(discount, amount));
};

const isLive = (d: { isActive: boolean; startDate?: Date | null; endDate?: Date | null }): boolean => {
  const now = new Date();
  if (!d.isActive) return false;
  if (d.startDate && new Date(d.startDate) > now) return false;
  if (d.endDate && new Date(d.endDate) < now) return false;
  return true;
};

// Product and all_products discounts can each have several active simultaneously;
// a matching product discount takes priority over the all_products one for that item.
const getActiveCatalogDiscounts = async () => {
  const discounts = await Discount.find({
    isActive: true,
    type: { $in: ["product", "all_products"] },
  }).lean();
  return discounts.filter(isLive);
};

const assertRewardEligibility = async (
  discount: { _id: string | { toString(): string } },
  email?: string
) => {
  if (!email) {
    throw new AppError("An email is required to redeem this coupon.", 400);
  }
  const normalizedEmail = email.toLowerCase().trim();
  const existingCustomer = await Customer.findOne({ email: normalizedEmail }).lean();
  if (!existingCustomer) {
    throw new AppError("This coupon is only available to existing customers.", 403);
  }
  const alreadyRedeemed = await RewardCouponUsage.findOne({
    discountId: discount._id.toString(),
    email: normalizedEmail,
  }).lean();
  if (alreadyRedeemed) {
    throw new AppError("You have already redeemed this coupon.", 400);
  }
};

export const resolveDiscounts = async (cartItems: CartItem[]): Promise<ResolveResult> => {
  const lineItems: ResolveResult["lineItems"] = cartItems.map((item) => ({
    ...item,
    subtotal: parseFloat((item.price * item.quantity).toFixed(2)),
    discount: null,
  }));

  const appliedDiscounts: AppliedDiscount[] = [];
  const catalogDiscounts = await getActiveCatalogDiscounts();
  const allProductsDiscount = catalogDiscounts.find((d) => d.type === "all_products");

  for (const item of lineItems) {
    const productDiscount = catalogDiscounts.find(
      (d) => d.type === "product" && d.productIds.some((pid) => pid.toString() === item.productId)
    );
    const applicable = productDiscount ?? allProductsDiscount;
    if (!applicable) continue;

    const saved = applyValue(item.subtotal, applicable.valueType as "percentage" | "fixed", applicable.value);
    item.subtotal = parseFloat((item.subtotal - saved).toFixed(2));
    const discountInfo: LineItemDiscount = {
      discountId: applicable._id.toString(),
      name: applicable.name,
      type: applicable.type as "product" | "all_products",
      valueType: applicable.valueType as "percentage" | "fixed",
      value: applicable.value,
      amountSaved: saved,
    };
    item.discount = discountInfo;
    appliedDiscounts.push(discountInfo);
  }

  const discountedSubtotal = parseFloat(lineItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2));
  const totalDiscount = parseFloat(
    appliedDiscounts.reduce((sum, d) => sum + d.amountSaved, 0).toFixed(2)
  );

  return { discountedSubtotal, totalDiscount, appliedDiscounts, lineItems };
};

export const recordDiscountUsages = async (appliedDiscounts: AppliedDiscount[], email?: string) => {
  if (appliedDiscounts.length === 0) return;

  await Promise.all(
    appliedDiscounts.map((d) => Discount.findByIdAndUpdate(d.discountId, { $inc: { usedCount: 1 } }))
  );

  const rewardCoupon = appliedDiscounts.find((d) => d.type === "coupon" && d.couponType === "reward");
  if (rewardCoupon && email) {
    try {
      await RewardCouponUsage.create({
        discountId: rewardCoupon.discountId,
        email: email.toLowerCase().trim(),
      });
    } catch (err: any) {
      // Duplicate key = already recorded (e.g. retried request) — safe to ignore.
      if (err?.code !== 11000) throw err;
    }
  }
};

const UPDATABLE_FIELDS: (keyof CreateDiscountInput)[] = [
  "name",
  "type",
  "couponType",
  "productIds",
  "valueType",
  "value",
  "code",
  "usageLimit",
  "startDate",
  "endDate",
  "isActive",
];

const assertNoOtherActiveDiscount = async (excludeId?: string) => {
  const query: Record<string, unknown> = {
    type: "all_products",
    isActive: true,
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Discount.findOne(query).lean();
  if (existing) {
    throw new AppError(
      `Another All Products discount ("${existing.name}") is already active. Please deactivate it first.`,
      400
    );
  }
};

export const createDiscount = async (body: CreateDiscountInput) => {
  if (!body.name || !body.type) {
    throw new AppError("Name and type are required.", 400);
  }

  if (!body.valueType || body.value === undefined) {
    throw new AppError("Value type and value are required.", 400);
  }

  // Coupon validation
  if (body.type === "coupon") {
    if (!body.code) {
      throw new AppError("Coupon code is required.", 400);
    }

    if (!body.couponType) {
      throw new AppError("Coupon type is required.", 400);
    }

    if (!["general", "reward"].includes(body.couponType)) {
      throw new AppError(
        "Coupon type must be either 'general' or 'reward'.",
        400
      );
    }

    body.code = body.code.toUpperCase();

    const existingCoupon = await Discount.findOne({
      code: body.code,
    }).lean();

    if (existingCoupon) {
      throw new AppError("Coupon code already exists.", 400);
    }
  }

  // Product discount validation
  if (
    body.type === "product" &&
    (!body.productIds || body.productIds.length === 0)
  ) {
    throw new AppError(
      "At least one product is required for a product discount.",
      400
    );
  }

  // Prevent productIds for other discount types
  if (
    body.type !== "product" &&
    body.productIds &&
    body.productIds.length > 0
  ) {
    throw new AppError(
      "productIds can only be used with product discounts.",
      400
    );
  }

  // Only one active all-products discount
  if (
    body.type === "all_products" &&
    body.isActive !== false
  ) {
    await assertNoOtherActiveDiscount();
  }

  return await Discount.create(body);
};

export const updateDiscount = async (id: string, body: Record<string, unknown>) => {
  if (!id) throw new AppError("id is required", 400);
  if (body.code && typeof body.code === "string") body.code = body.code.toUpperCase();

  if (body.isActive === true) {
    const existing = await Discount.findById(id).lean();
    if ((body.type ?? existing?.type) === "all_products") {
      await assertNoOtherActiveDiscount(id);
    }
  }

  const sanitized = Object.fromEntries(
    UPDATABLE_FIELDS.filter((key) => key in body).map((key) => [key, body[key]])
  );
  const discount = await Discount.findByIdAndUpdate(id, sanitized, {
    new: true,
    runValidators: true,
  });
  if (!discount) throw new AppError("Discount not found", 404);
  return discount;
};

export const deleteDiscount = async (id: string) => {
  if (!id) throw new AppError("id is required", 400);
  const discount = await Discount.findByIdAndDelete(id);
  if (!discount) throw new AppError("Discount not found", 404);
};

export const getAllDiscounts = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Discount.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Discount.countDocuments(),
  ]);
  return { data, pagination: { total, page, totalPages: Math.ceil(total / limit) } };
};

export const recordCustomerFirstOrder = async (email: string, orderId: string): Promise<boolean> => {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    await Customer.create({ email: normalizedEmail, firstOrderId: orderId });
    return true;
  } catch (err: any) {
    // Duplicate key = not their first order — nothing to do.
    if (err?.code !== 11000) throw err;
    return false;
  }
};

export const getActiveRewardCoupon = async () => {
  const now = new Date();
  return Discount.findOne({
    type: "coupon",
    couponType: "reward",
    isActive: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  }).lean();
};

export const validateCoupon = async (code: string, subtotal: number, email?: string) => {
  const coupon = await Discount.findOne({ type: "coupon", code: code.toUpperCase() }).lean();
  if (!coupon || !isLive(coupon)) {
    throw new AppError("Invalid or expired coupon", 400);
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError("Coupon usage limit reached", 400);
  }
  if (coupon.couponType === "reward") {
    await assertRewardEligibility(coupon, email);
  }

  const discountAmount = applyValue(subtotal, coupon.valueType as "percentage" | "fixed", coupon.value);

  return {
    valid: true,
    coupon,
    summary: { subtotal, discount: discountAmount, total: subtotal - discountAmount },
  };
};
