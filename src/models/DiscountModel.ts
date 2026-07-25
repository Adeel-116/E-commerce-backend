import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["coupon", "product", "all_products"],
      required: true,
    },

    couponType: {
      type: String,
      enum: ["general", "reward"],
      default: null,
      required: function (this: any) {
        return this.type === "coupon";
      },
    },

    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    valueType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    code: {
      type: String,
      uppercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },

    usageLimit: {
      type: Number,
      default: null,
    },

    usedCount: {
      type: Number,
      default: 0,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

discountSchema.index({ type: 1, isActive: 1 });

export const Discount = mongoose.model("Discount", discountSchema);
