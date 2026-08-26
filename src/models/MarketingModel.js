const { Schema, model } = require("mongoose");

const MarketingSchema = new Schema(
  {
    adName: { type: String, required: true },
    platform: { type: String, required: true },
    totalBudget: { type: Number, default: 0 },
    dailyBudget: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalSpent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Completed", "Paused"],
      default: "Active",
    },
    notes: { type: String },
  },
  { timestamps: true, collection: "Marketing" },
);

module.exports = model("Marketing", MarketingSchema);
