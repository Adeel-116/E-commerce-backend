const ContactUs = require("../models/ContactUsModel");
const { AppError } = require("../utils/AppError");

const createContactUs = async (body) => {
  const { fullName, email, contact, message } = body;
  if (!fullName || !email || !contact || !message) {
    throw new AppError("fullName, email, contact and message are required", 400);
  }
  return ContactUs.create({ fullName, email, contact, message });
};

const getContactUsById = async (id) => {
  if (!id) throw new AppError("id is required", 400);
  const contactUs = await ContactUs.findById(id);
  if (!contactUs) throw new AppError("Contact us entry not found", 404);
  return contactUs;
};

const getAllContactUs = async (page, limit) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    ContactUs.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContactUs.countDocuments(),
  ]);
  return { data, pagination: { total, page, totalPages: Math.ceil(total / limit) } };
};

const deleteContactUs = async (id) => {
  if (!id) throw new AppError("id is required", 400);
  const contactUs = await ContactUs.findByIdAndDelete(id);
  if (!contactUs) throw new AppError("Contact us entry not found", 404);
};

module.exports = {
  createContactUs,
  getContactUsById,
  getAllContactUs,
  deleteContactUs,
};
