import ContactUs from "../models/ContactUsModel";
import { AppError } from "../utils/AppError";
import type { CreateContactUsInput } from "../types";

export const createContactUs = async (body: CreateContactUsInput) => {
  const { fullName, email, contact, message } = body;
  if (!fullName || !email || !contact || !message) {
    throw new AppError("fullName, email, contact and message are required", 400);
  }
  return ContactUs.create({ fullName, email, contact, message });
};

export const getContactUsById = async (id: string) => {
  if (!id) throw new AppError("id is required", 400);
  const contactUs = await ContactUs.findById(id);
  if (!contactUs) throw new AppError("Contact us entry not found", 404);
  return contactUs;
};

export const getAllContactUs = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    ContactUs.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContactUs.countDocuments(),
  ]);
  return { data, pagination: { total, page, totalPages: Math.ceil(total / limit) } };
};

export const deleteContactUs = async (id: string) => {
  if (!id) throw new AppError("id is required", 400);
  const contactUs = await ContactUs.findByIdAndDelete(id);
  if (!contactUs) throw new AppError("Contact us entry not found", 404);
};
