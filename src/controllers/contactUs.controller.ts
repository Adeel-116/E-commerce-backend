import { RequestHandler } from "express";
import * as ContactUsService from "../services/contactUs.service";

export const createContactUs: RequestHandler = async (req, res) => {
  const contactUs = await ContactUsService.createContactUs(req.body);
  res.status(201).json({ success: true, message: "Contact us submitted successfully", data: contactUs });
};

export const getContactUsById: RequestHandler = async (req, res) => {
  const contactUs = await ContactUsService.getContactUsById(req.query.id as string);
  res.status(200).json({ success: true, data: contactUs });
};

export const getAllContactUs: RequestHandler = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await ContactUsService.getAllContactUs(page, limit);
  res.status(200).json({ success: true, ...result });
};

export const deleteContactUs: RequestHandler = async (req, res) => {
  await ContactUsService.deleteContactUs(req.query.id as string);
  res.status(200).json({ success: true, message: "Contact us entry deleted successfully" });
};
