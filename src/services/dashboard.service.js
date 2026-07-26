const { OrderModel } = require("../models/OrderModel");
const { User } = require("../models/UserModel");
const Product = require("../models/ProductModel");

const parsePeriod = (period) => {
  const now = new Date();
  const match = period.match(/^(\d+)([dwmy])$/);
  if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const n = Number(match[1]);
  switch (match[2]) {
    case "d": return new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    case "w": return new Date(now.getTime() - n * 7 * 24 * 60 * 60 * 1000);
    case "m": { const d = new Date(now); d.setMonth(d.getMonth() - n); return d; }
    case "y": { const d = new Date(now); d.setFullYear(d.getFullYear() - n); return d; }
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

const getDashboardStats = async (period) => {
  const since = parsePeriod(period);
  const [
    revenueResult,
    paidOrdersResult,
    orderStats,
    totalUsers,
    newUsers,
    totalProducts,
    topProducts,
    recentOrders,
    sizeSales
  ] = await Promise.all([
    OrderModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } },
    ]),
    OrderModel.aggregate([
      // { $match: { "payment.status": "paid", createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          totalPaidOrderAmount: {
            $sum: {
              $cond: [
                { $eq: ["$payment.status", "paid"] },
                "$pricing.total",
                0
              ]
            }
          },
          grossProfit: {
            $sum: {
              $subtract: [
                "$pricing.subtotal",
                { $add: ["$pricing.discount", "$pricing.bundleSavings"] },
              ],
            },
          },
          totalShipping: { $sum: "$pricing.shipping" },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
    OrderModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since } }),
    Product.countDocuments(),
    OrderModel.aggregate([
      { $match: { "payment.status": "paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          title: { $first: "$items.title" },
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),
    OrderModel.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("orderId status pricing.total createdAt")
      .lean(),

    OrderModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.size",
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
    ]),
  ]);

  const orderStatusMap = Object.fromEntries(
    orderStats.map(({ _id, count }) => [_id, count])
  );

  const paidStats = paidOrdersResult[0] ?? { totalPaidOrderAmount: 0, grossProfit: 0, totalShipping: 0, totalOrders: 0 };


  const itemsSoldBySize = Object.fromEntries(
    sizeSales.map(({ _id, totalQuantity }) => [_id, totalQuantity])
  );

  const netProfit = paidStats.grossProfit - paidStats.totalShipping;

  return {
    period,
    revenue: revenueResult[0]?.total ?? 0,
    grossProfit: paidStats.grossProfit,
    netProfit,
    totalOrders: paidStats.totalOrders,
    totalPaidOrderAmount: paidStats.totalPaidOrderAmount,

    itemsSoldBySize,
    orders: {
      total: Object.values(orderStatusMap).reduce((a, b) => a + b, 0),
      byStatus: orderStatusMap,
    },
    users: { total: totalUsers, new: newUsers },
    totalProducts,
    topProducts,
    recentOrders,
  };
};

module.exports = { getDashboardStats };
