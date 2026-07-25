import { RequestHandler } from "express";
import * as DiscountService from "../services/discount.service";

export const createDiscount: RequestHandler = async (req, res) => {
  const discount = await DiscountService.createDiscount(req.body);
  res.status(201).json({ success: true, message: "Discount created successfully", data: discount });
};

export const updateDiscount: RequestHandler = async (req, res) => {
  const updated = await DiscountService.updateDiscount(req.query.id as string, req.body);
  res.status(200).json({ success: true, message: "Discount updated successfully", data: updated });
};

export const deleteDiscount: RequestHandler = async (req, res) => {
  await DiscountService.deleteDiscount(req.query.id as string);
  res.status(200).json({ success: true, message: "Discount deleted successfully" });
};

export const getAllDiscounts: RequestHandler = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await DiscountService.getAllDiscounts(page, limit);
  res.status(200).json({ success: true, ...result });
};
