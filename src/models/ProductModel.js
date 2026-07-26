const mongoose = require("mongoose");

const CATEGORY_OPTIONS = ["maxi", "fashion", "top-jeans", "western"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

const colorVariantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        hex: { type: String, required: true, trim: true },
        images: { type: [String], default: [] },
    },
    { _id: false }
);

const productSchema = new mongoose.Schema(
    {
        productId: { type: Number },
        title: { type: String, required: true },
        slug: { type: String, unique: true },
        description: { type: String, default: "" },
        images: { type: [String], default: [] },
        price: { type: Number, required: true, default: 0 },
        comparePrice: { type: Number, default: null },
        category: { type: [String], enum: CATEGORY_OPTIONS, default: [] },
        sizes: { type: [String], enum: SIZE_OPTIONS, default: [] },
        colors: { type: [colorVariantSchema], default: [] },
        isNew: { type: Boolean, default: false },
        isBestSeller: { type: Boolean, default: false },
        stock: { type: Boolean, default: true },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
    },
    {
        timestamps: true,
    }
);

productSchema.index({ productId: 1 }, { unique: true });

module.exports = mongoose.model("Product", productSchema);
module.exports.CATEGORY_OPTIONS = CATEGORY_OPTIONS;
module.exports.SIZE_OPTIONS = SIZE_OPTIONS;
