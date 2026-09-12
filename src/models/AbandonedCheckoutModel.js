const mongoose = require("mongoose");
const { Schema } = mongoose;

const CheckoutItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    title: { type: String, default: "" },
    image: { type: String, default: "" },
    size: { type: String, default: "" },
    color: { type: String, default: null },
    stitching: { type: String, default: null },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
  },
  { _id: false },
);

const AbandonedCheckoutSchema = new Schema(
  {
    ownerId: { type: String, required: true, unique: true, index: true },
    ownerType: { type: String, enum: ["user", "guest"], required: true },
    customer: {
      firstName: { type: String, default: "" },
      lastName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    shippingAddress: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "Pakistan" },
    },
    items: { type: [CheckoutItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["open", "contacted", "recovered", "dismissed", "completed"],
      default: "open",
      index: true,
    },
    notes: { type: String, default: "" },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    completedOrderId: { type: String, default: "" },
  },
  { timestamps: true, collection: "AbandonedCheckout" },
);

const AbandonedCheckout =
  mongoose.models.AbandonedCheckout ||
  mongoose.model("AbandonedCheckout", AbandonedCheckoutSchema);

module.exports = { AbandonedCheckout };
