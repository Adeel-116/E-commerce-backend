import mongoose, { Document, Schema, Types } from "mongoose";

export interface IBundlePrice {
  itemCount?: number;
  price?: number;
}

export interface IBundle extends Document {
  title?: string;
  productId?: Types.ObjectId;
  numberOfItems?: number;
  prices?: IBundlePrice[];
  savedAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const bundlePriceSchema = new Schema<IBundlePrice>(
  {
    itemCount: { type: Number },
    price: { type: Number },
  },
  { _id: false }
);

const bundleSchema = new Schema<IBundle>(
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

const Bundle = mongoose.model<IBundle>("Bundle", bundleSchema);

export default Bundle;
