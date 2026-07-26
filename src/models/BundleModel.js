const mongoose = require("mongoose");
const { Schema } = mongoose;

const bundlePriceSchema = new Schema(
  {
    itemCount: { type: Number },
    price: { type: Number },
  },
  { _id: false }
);

const bundleSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    numberOfItems: {
      type: Number,
    },

    prices: {
      type: [bundlePriceSchema],
      default: [],
    },

    // (product.price * numberOfItems) - sum(prices[].price), computed
    // whenever the bundle is created or updated.
    savedAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Bundle = mongoose.model("Bundle", bundleSchema);

module.exports = Bundle;
