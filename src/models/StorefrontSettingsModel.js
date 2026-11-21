const mongoose = require("mongoose");

const storefrontSettingsSchema = new mongoose.Schema({
  key: { type: String, default: "global", unique: true, immutable: true },
  marqueeText: {
    type: String,
    trim: true,
    maxlength: 160,
    default: "Free Shipping & a Free Gift on Orders Above Rs 10,000",
  },
}, { timestamps: true });

module.exports = mongoose.model("StorefrontSettings", storefrontSettingsSchema);
