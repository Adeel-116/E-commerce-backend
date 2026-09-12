const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, trim: true, maxlength: 80, default: "Pakistan" },
    text: { type: String, required: true, trim: true, maxlength: 800 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    screenshot: { type: String, trim: true, default: "" },
    verified: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
