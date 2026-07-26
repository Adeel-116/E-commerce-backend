const Subscriber = require("../models/SubscriberModel");
const { AppError } = require("../utils/AppError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createSubscriber = async (body) => {
  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new AppError("A valid email is required", 400);
  }

  const existing = await Subscriber.findOne({ email });
  if (existing) {
    throw new AppError("This email is already subscribed", 409);
  }

  return Subscriber.create({ email });
};

const getAllSubscribers = async (page, limit) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Subscriber.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Subscriber.countDocuments(),
  ]);
  return { data, pagination: { total, page, totalPages: Math.ceil(total / limit) } };
};

const deleteSubscriber = async (id) => {
  if (!id) throw new AppError("id is required", 400);
  const subscriber = await Subscriber.findByIdAndDelete(id);
  if (!subscriber) throw new AppError("Subscriber not found", 404);
};

module.exports = {
  createSubscriber,
  getAllSubscribers,
  deleteSubscriber,
};
