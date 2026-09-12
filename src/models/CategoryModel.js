const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
  },
  { _id: false },
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    image: { type: imageSchema, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    order: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

categorySchema.index({ status: 1, order: 1 });

module.exports = mongoose.model("Category", categorySchema);