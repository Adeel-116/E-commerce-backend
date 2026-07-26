const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: null,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    ownerType: {
      type: String,
      enum: ["user", "guest"],
      required: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// TTL for guest carts
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// IMPORTANT: avoid model overwrite issues in dev
const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

module.exports = { Cart };
