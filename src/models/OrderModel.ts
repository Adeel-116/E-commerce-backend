import { Schema, model } from "mongoose";

const OrderItemSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        title: { type: String, required: true },
        image: { type: String, default: "" },
        size: { type: String, required: true },
        color: { type: String, default: null },
        price: { type: Number, required: true },
        originalPrice: { type: Number, required: true },
        quantity: { type: Number, required: true },
        subtotal: { type: Number, required: true },
    },
    { _id: false }
);

const AppliedDiscountSchema = new Schema(
    {
        discountId: { type: Schema.Types.ObjectId, ref: "Discount", required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["coupon", "product", "all_products"], required: true },
        code: { type: String },        
        couponType: { type: String, enum: ["general", "reward"] }, 
        valueType: { type: String, enum: ["percentage", "fixed"], required: true },
        value: { type: Number, required: true },
        amountSaved: { type: Number, required: true }, 
    },
    { _id: false }
);

const PricingSchema = new Schema(
    {
        subtotal: { type: Number, required: true },
        shipping: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        bundleSavings: { type: Number, default: 0 },
        total: { type: Number, required: true },
    },
    { _id: false }
);

const ShippingAddressSchema = new Schema(
    {
        fullName: { type: String, required: true },
        email: { type: String },
        line1: { type: String, required: true },
        line2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
        phone: { type: String, required: true },
    },
    { _id: false }
);

const PaymentSchema = new Schema(
    {
        method: { type: String, default: "cod" },
        status: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },
        paidAt: { type: Date },
    },
    { _id: false }
);

const OrderSchema = new Schema(
    {
        orderId: { type: String, required: true, unique: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        guestEmail: { type: String },
        cartOwnerId: { type: String },
        items: { type: [OrderItemSchema], required: true },
        pricing: { type: PricingSchema, required: true },
        appliedDiscounts: { type: [AppliedDiscountSchema], default: [] },
        shippingAddress: { type: ShippingAddressSchema, required: true },
        payment: { type: PaymentSchema, required: true },
        status: {
            type: String,
            enum: ["processing", "preparation", "shipped", "delivered", "cancelled", "returned"],
            default: "processing",
            index: true,
        },
        trackingNumber: { type: String },
        notes: { type: String },
        emailSent: { type: Boolean, default: false },
        isFirstOrder: { type: Boolean, default: false },
    },
    { timestamps: true, collection: "Order" }
);

export const OrderModel = model("Order", OrderSchema);
