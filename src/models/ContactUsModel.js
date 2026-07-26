const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactUs", contactUsSchema);
