// import { OrderModel } from "../models/OrderModel";

// export const generateOrderId = async (totalOrders:any): Promise<string> => {
//   for (let attempt = 0; attempt < 10; attempt++) {
//     const num = Math.floor(10000 + Math.random() * 90000);
//     const orderId = `MSO-${num}`;
//     const exists = await OrderModel.exists({ orderId });
//     if (!exists) return orderId;
//   }
//   throw new Error("Failed to generate a unique order ID");
// };


export const generateOrderId = (totalOrdersDB: any): string => {
  // console.log("Order Number", totalOrdersDB)
  return `MSO-${1000 + totalOrdersDB}`;
};