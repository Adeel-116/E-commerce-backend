const Review = require("../models/ReviewModel");
const { AppError } = require("../utils/AppError");
const { uploadImageBuffer } = require("../config/cloudinary");

const normalize = (body) => ({
  name: String(body.name || "").trim(),
  city: String(body.city || "Pakistan").trim(),
  text: String(body.text || "").trim(),
  rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
  verified: body.verified !== "false",
  active: body.active !== "false",
  order: Number(body.order) || 0,
});

const listPublicReviews = async (_req, res) => {
  const data = await Review.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
  res.json({ success: true, data });
};

const listAdminReviews = async (_req, res) => {
  const data = await Review.find().sort({ order: 1, createdAt: -1 }).lean();
  res.json({ success: true, data });
};

const createReview = async (req, res) => {
  const values = normalize(req.body);
  if (!values.name || !values.text) throw new AppError("Customer name and review text are required", 400);
  if (req.file) values.screenshot = await uploadImageBuffer(req.file.buffer);
  const data = await Review.create(values);
  res.status(201).json({ success: true, message: "Review created", data });
};

const updateReview = async (req, res) => {
  const values = normalize(req.body);
  if (!values.name || !values.text) throw new AppError("Customer name and review text are required", 400);
  if (req.file) values.screenshot = await uploadImageBuffer(req.file.buffer);
  const data = await Review.findByIdAndUpdate(req.params.id, values, { new: true, runValidators: true });
  if (!data) throw new AppError("Review not found", 404);
  res.json({ success: true, message: "Review updated", data });
};

const deleteReview = async (req, res) => {
  const data = await Review.findByIdAndDelete(req.params.id);
  if (!data) throw new AppError("Review not found", 404);
  res.json({ success: true, message: "Review deleted" });
};

module.exports = { listPublicReviews, listAdminReviews, createReview, updateReview, deleteReview };
