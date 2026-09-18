const mongoose = require("mongoose");

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "1Y", "2Y", "3Y", "4Y", "5Y", "6Y", "2-3 Years", "4-5 Years", "5-6 Years"];

const colorVariantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    productId: { type: Number },
    sourceProductId: { type: Number },
    sourceUrl: { type: String, default: "" },
    sourceVariants: { type: [mongoose.Schema.Types.Mixed], default: [] },
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, default: "" },
    images: { type: [String], default: [] },
    measurementImage: { type: String, default: "" },
    measurementCharts: {
      type: [{
        title: String,
        unit: { type: String, default: "inches" },
        diagramImage: String,
        sizes: [String],
        rows: [{ label: String, values: [String] }],
      }],
      default: [],
    },
    price: { type: Number, required: true, default: 0 },
    sizePrices: { type: mongoose.Schema.Types.Mixed, default: {} },
    comparePrice: { type: Number, default: null },
    isStitched: { type: Boolean, default: false },
    isUnstitched: { type: Boolean, default: false },
    stitchedPrice: { type: Number, default: null },
    category: { type: [String], default: [] },
    sizes: { type: [String], enum: SIZE_OPTIONS, default: [] },
    colors: { type: [colorVariantSchema], default: [] },
    isNew: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    // Admin-controlled eligibility for the product detail page's "You
    // May Also Like" section — only products with this on can appear
    // there (see product.service.js getSimilarProducts).
    showInYouMayAlsoLike: { type: Boolean, default: false },
    stock: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    // Lower numbers show first on the homepage Best Sellers grid and the
    // Shop page's default "Best Selling" sort. Products default to 0 and
    // fall back to newest-first among themselves (see product.service.js buildSort).
    displayOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

productSchema.index({ productId: 1 }, { unique: true });

module.exports = mongoose.model("Product", productSchema);
module.exports.SIZE_OPTIONS = SIZE_OPTIONS;


