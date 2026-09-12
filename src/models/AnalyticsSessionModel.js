const mongoose = require("mongoose");
const { Schema } = mongoose;

const PageViewSchema = new Schema(
  {
    path: { type: String, required: true },
    title: { type: String, default: "" },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AnalyticsSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    visitorId: { type: String, required: true, index: true },
    firstSeenAt: { type: Date, default: Date.now, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    landingPage: { type: String, default: "/" },
    referrer: { type: String, default: "Direct" },
    source: { type: String, default: "Direct", index: true },
    campaign: { type: String, default: "" },
    device: { type: String, enum: ["mobile", "tablet", "desktop"], default: "desktop" },
    country: { type: String, default: "Unknown" },
    city: { type: String, default: "Unknown" },
    checkoutStarted: { type: Boolean, default: false, index: true },
    pages: { type: [PageViewSchema], default: [] },
  },
  { timestamps: true, collection: "AnalyticsSession" },
);

AnalyticsSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

const AnalyticsSession = mongoose.models.AnalyticsSession ||
  mongoose.model("AnalyticsSession", AnalyticsSessionSchema);

module.exports = { AnalyticsSession };
