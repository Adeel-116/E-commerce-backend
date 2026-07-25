import mongoose from "mongoose";

export const CATEGORY_OPTIONS = ["maxi", "fashion", "top-jeans", "western"] as const;
export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

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

export default mongoose.model("Product", productSchema);
