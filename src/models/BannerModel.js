const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
}, { _id: false });

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  href: { type: String, default: "/shop" },
  order: { type: Number, default: 0 },
  textless: { type: Boolean, default: false },
  desktop: { type: imageSchema, required: true },
  mobile: { type: imageSchema, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Banner", bannerSchema);
