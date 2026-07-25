import { RequestHandler } from "express";
import * as OrderService from "../services/order.service";

export const getOrderHistory: RequestHandler = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const result = await OrderService.getOrderHistory(req.user!.id, page, limit);
  res.status(200).json({ success: true, ...result });
};

export const getOrderById: RequestHandler<{ orderId: string }> = async (req, res) => {
  const order = await OrderService.getOrderById(req.params.orderId, req.user!.id);
  res.status(200).json({ success: true, order });
};

export const getAllOrders: RequestHandler = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const result = await OrderService.getAllOrders(
    page,
    limit,
    req.query.status as string | undefined
  );
  res.status(200).json({ success: true, ...result });
};

export const updateOrderStatus: RequestHandler<{ orderId: string }> = async (req, res) => {
  const { order, previousStatus } = await OrderService.updateOrderStatus(
    req.params.orderId,
    req.body.status
  );

  res.status(200).json({
    success: true,
    message: `Order status updated from "${previousStatus}" to "${order.status}"`,
    order,
  });
};

export const updatePaymentStatus: RequestHandler<{ orderId: string }> = async (req, res) => {
  const { order, previousPaymentStatus } = await OrderService.updatePaymentStatus(
    req.params.orderId,
    req.body.paymentStatus
  );
  res.status(200).json({
    success: true,
    message: `Payment status updated from "${previousPaymentStatus}" to "${order.payment.status}"`,
    order,
  });
};

export const deleteOrder: RequestHandler = async (req, res) => {
  await OrderService.deleteOrder(req.query.orderId as string);
  res.status(200).json({ success: true, message: "Order deleted successfully" });
};



export const getOrderEmails: RequestHandler = async (req, res) => {
  const response = await OrderService.getCustomerOrderStats({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: (req.query.search as string) || "",
  });

  res.status(200).json({
    success: true,
    message: "Order Emails Fetch Successfully",
    data: response,
  });
};