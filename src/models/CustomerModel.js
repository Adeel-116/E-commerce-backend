const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    firstOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

module.exports = { Customer };
