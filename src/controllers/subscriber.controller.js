const SubscriberService = require("../services/subscriber.service");

const subscribeEmail = async (req, res) => {
  const subscriber = await SubscriberService.createSubscriber(req.body);
  res.status(201).json({ success: true, message: "Subscribed successfully", data: subscriber });
};

const getAllSubscribers = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await SubscriberService.getAllSubscribers(page, limit);
  res.status(200).json({ success: true, ...result });
};

const deleteSubscriber = async (req, res) => {
  await SubscriberService.deleteSubscriber(req.query.id);
  res.status(200).json({ success: true, message: "Subscriber deleted successfully" });
};

module.exports = {
  subscribeEmail,
  getAllSubscribers,
  deleteSubscriber,
};
