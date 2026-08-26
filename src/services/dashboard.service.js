const { OrderModel } = require("../models/OrderModel");
const { User } = require("../models/UserModel");
const Product = require("../models/ProductModel");

const parsePeriod = (period) => {
  const now = new Date();
  const match = period.match(/^(\d+)([dwmy])$/);
  if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const n = Number(match[1]);
  switch (match[2]) {
    case "d":
      return new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    case "w":
      return new Date(now.getTime() - n * 7 * 24 * 60 * 60 * 1000);
    case "m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - n);
      return d;
    }
    case "y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - n);
      return d;
    }
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

const getDashboardStats = async (period, startDateStr, endDateStr) => {
  let start = parsePeriod(period);
  let end = new Date();

  if (startDateStr && endDateStr) {
    start = new Date(startDateStr);
    end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
  }

  const query = { createdAt: { $gte: start, $lte: end } };

  const [
    allOrders,
    orderStats,
    totalUsers,
    newUsers,
    totalProducts,
    topProducts,
    recentOrders,
    sizeSales,
  ] = await Promise.all([
    OrderModel.find(query).lean(),
    OrderModel.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
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
      { $match: query },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.size",
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
    ]),
  ]);

  let totalSales = 0;
  let totalDiscounts = 0;
  let totalShipping = 0;

  let cancelledCount = 0;
  let cancelledAmount = 0;

  let returnedCount = 0;
  let returnedAmount = 0;

  let validOrderCount = 0;

  for (const o of allOrders) {
    if (o.status === "cancelled") {
      cancelledCount++;
      cancelledAmount += o.pricing?.total || 0;
    } else if (o.status === "returned") {
      returnedCount++;
      returnedAmount += o.pricing?.total || 0;
    } else {
      totalSales += o.pricing?.subtotal || 0;
      totalDiscounts +=
        (o.pricing?.discount || 0) + (o.pricing?.bundleSavings || 0);
      totalShipping += o.pricing?.shipping || 0;
      validOrderCount++;
    }
  }

  // Find overlapping marketing campaigns (any status — Active, Completed, Paused all count)
  const Marketing = require("../models/MarketingModel");
  const marketingQuery = {
    startDate: { $lte: end },
    endDate: { $gte: start },
  };
  const campaigns = await Marketing.find(marketingQuery);
  let totalMarketingCost = 0;
  for (const c of campaigns) {
    if (c.totalSpent > 0) {
      // Use actual spend if recorded
      totalMarketingCost += c.totalSpent;
    } else if (c.totalBudget > 0) {
      // Use total budget as the planned spend
      totalMarketingCost += c.totalBudget;
    } else {
      // Fallback: estimate from dailyBudget × days
      const campStart = new Date(c.startDate);
      const campEnd = new Date(c.endDate);
      const days = Math.max(
        1,
        Math.round((campEnd - campStart) / (1000 * 60 * 60 * 24)),
      );
      totalMarketingCost += (c.dailyBudget || 0) * days;
    }
  }

  // Formula updates
  const shippingCustomerPaid = totalShipping;
  const shippingWePaid = validOrderCount * 200; // Flat 200 per order
  const revenue = totalSales - totalDiscounts;
  const netProfit =
    revenue - shippingWePaid - totalMarketingCost - returnedAmount;

  const orderStatusMap = Object.fromEntries(
    orderStats.map(({ _id, count }) => [_id, count]),
  );

  const itemsSoldBySize = Object.fromEntries(
    sizeSales.map(({ _id, totalQuantity }) => [_id, totalQuantity]),
  );

  return {
    period,
    totalSales,
    totalDiscounts,
    revenue,
    shippingCustomerPaid,
    shippingWePaid,
    totalMarketingCost,
    netProfit,

    cancelledOrders: { count: cancelledCount, amount: cancelledAmount },
    returnedOrders: { count: returnedCount, amount: returnedAmount },

    totalOrders: allOrders.length,
    totalPaidOrderAmount: allOrders
      .filter((o) => o.payment?.status === "paid")
      .reduce((acc, o) => acc + (o.pricing?.total || 0), 0),

    itemsSoldBySize,
    orders: {
      total: allOrders.length,
      byStatus: orderStatusMap,
    },
    users: { total: totalUsers, new: newUsers },
    totalProducts,
    topProducts,
    recentOrders,
  };
};

module.exports = { getDashboardStats };
