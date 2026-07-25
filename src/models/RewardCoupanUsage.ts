import mongoose from "mongoose";

const rewardCouponUsageSchema = new mongoose.Schema(
  {
    discountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discount",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    redeemedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

rewardCouponUsageSchema.index(
  {
    discountId: 1,
    email: 1,
  },
  {
    unique: true,
  }
);

export const RewardCouponUsage = mongoose.model(
  "RewardCouponUsage",
  rewardCouponUsageSchema
);