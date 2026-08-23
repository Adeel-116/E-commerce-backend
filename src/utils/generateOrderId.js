const { OrderModel } = require("../models/OrderModel");

const generateOrderId = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const num = Math.floor(10000 + Math.random() * 90000);
    const orderId = `MSO-${num}`;
    const exists = await OrderModel.exists({ orderId });
    if (!exists) return orderId;
  }
  throw new Error("Failed to generate a unique order ID");
};

module.exports = { generateOrderId };
