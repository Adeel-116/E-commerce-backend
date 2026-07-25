import { RequestHandler } from "express";
import * as DashboardService from "../services/dashboard.service";

export const getDashboardStats: RequestHandler = async (req, res) => {
  const periodParam = (req.query.period as string) || "30d";
  const result = await DashboardService.getDashboardStats(periodParam);
  res.status(200).json({ success: true, ...result });
};
