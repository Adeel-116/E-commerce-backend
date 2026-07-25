import { RequestHandler } from "express";
import * as SubscriberService from "../services/subscriber.service";

export const subscribeEmail: RequestHandler = async (req, res) => {
  const subscriber = await SubscriberService.createSubscriber(req.body);
  res.status(201).json({ success: true, message: "Subscribed successfully", data: subscriber });
};

export const getAllSubscribers: RequestHandler = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await SubscriberService.getAllSubscribers(page, limit);
  res.status(200).json({ success: true, ...result });
};

export const deleteSubscriber: RequestHandler = async (req, res) => {
  await SubscriberService.deleteSubscriber(req.query.id as string);
  res.status(200).json({ success: true, message: "Subscriber deleted successfully" });
};
