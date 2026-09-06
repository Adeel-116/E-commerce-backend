const { OrderModel } = require("../models/OrderModel");
const { AppError } = require("../utils/AppError");

const ORDER_STATUSES = [
  "processing",
  "dispatch",
  "delivered",
  "cancelled",
  "returned",
  "cancelled",
];

const getOrderHistory = async (userId, page, limit) => {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    OrderModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments({ userId }),
  ]);
  return { orders, total, page, totalPages: Math.ceil(total / limit) };
};

const getOrderById = async (orderId, userId) => {
  const order = await OrderModel.findOne({ orderId, userId }).lean();
  if (!order) throw new AppError("Order not found", 404);
  return order;
};

const getAllOrders = async (page, limit, status) => {
  const skip = (page - 1) * limit;
  const filter = status ? { status } : {};
  const [orders, total] = await Promise.all([
    OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments(filter),
  ]);
  return {
    orders,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  };
};

const updateOrderStatus = async (orderId, newStatus) => {
  if (!ORDER_STATUSES.includes(newStatus)) {
    throw new AppError(
      `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}`,
      400,
    );
  }

  const order = await OrderModel.findOne({ orderId });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const previousStatus = order.status;

  // Direct status update — no transition restriction
  order.status = newStatus;

  await order.save();

  return {
    order,
    previousStatus,
  };
};

const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

const updatePaymentStatus = async (orderId, newPaymentStatus) => {
  if (!PAYMENT_STATUSES.includes(newPaymentStatus)) {
    throw new AppError(
      `Invalid payment status. Must be one of: ${PAYMENT_STATUSES.join(", ")}`,
      400,
    );
  }
  const order = await OrderModel.findOne({ orderId });
  if (!order) throw new AppError("Order not found", 404);

  const previousPaymentStatus = order.payment.status;
  order.payment.status = newPaymentStatus;
  order.payment.paidAt = newPaymentStatus === "paid" ? new Date() : undefined;
  await order.save();

  return { order, previousPaymentStatus };
};

const deleteOrder = async (orderId) => {
  if (!orderId) throw new AppError("orderId is required", 400);
  const result = await OrderModel.deleteOne({ orderId });
  if (result.deletedCount === 0) throw new AppError("Order not found", 404);
};

const updateOrderDetails = async (orderId, payload) => {
  const order = await OrderModel.findOne({ orderId });
  if (!order) throw new AppError("Order not found", 404);

  // --- Items ---
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    order.items = payload.items.map((item) => {
      const price = Number(item.price) || 0;
      const originalPrice = Number(item.originalPrice) || price;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return {
        productId: item.productId,
        title: item.title,
        image: item.image || "",
        size: item.size || "",
        color: item.color ?? null,
        price,
        originalPrice,
        quantity,
        subtotal: price * quantity,
      };
    });
  }

  // --- Pricing ---
  const itemsSubtotal = order.items.reduce(
    (s, i) => s + i.price * i.quantity,
    0,
  );
  const shipping =
    payload.pricing?.shipping !== undefined
      ? Number(payload.pricing.shipping)
      : order.pricing.shipping;
  const discount =
    payload.pricing?.discount !== undefined
      ? Number(payload.pricing.discount)
      : order.pricing.discount;
  const bundleSavings =
    payload.pricing?.bundleSavings !== undefined
      ? Number(payload.pricing.bundleSavings)
      : order.pricing.bundleSavings;

  order.pricing = {
    subtotal: itemsSubtotal,
    shipping,
    discount,
    bundleSavings,
    total: Math.max(0, itemsSubtotal + shipping - discount - bundleSavings),
  };

  // --- Coupon / notes ---
  if (payload.notes !== undefined) order.notes = payload.notes;

  // --- Shipping address ---
  if (payload.shippingAddress) {
    Object.assign(order.shippingAddress, payload.shippingAddress);
  }

  // --- Order date ---
  if (payload.createdAt) order.createdAt = new Date(payload.createdAt);

  await order.save();
  return order;
};

const getCustomerOrderStats = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  const matchStage = search
    ? {
        $match: {
          $or: [
            { guestEmail: { $regex: search, $options: "i" } },
            { "shippingAddress.email": { $regex: search, $options: "i" } },
          ],
        },
      }
    : null;

  const pipeline = [];

  if (matchStage) {
    pipeline.push(matchStage);
  }

  pipeline.push(
    {
      $addFields: {
        customerEmail: {
          $ifNull: ["$guestEmail", "$shippingAddress.email"],
        },
      },
    },
    {
      $group: {
        _id: "$customerEmail",

        totalOrders: { $sum: 1 },

        totalSpent: {
          $sum: "$pricing.total",
        },

        lastOrderDate: {
          $max: "$createdAt",
        },

        items: {
          $push: "$items",
        },
      },
    },
    {
      $project: {
        _id: 0,
        email: "$_id",
        totalOrders: 1,
        totalSpent: 1,
        lastOrderDate: 1,

        totalItems: {
          $sum: {
            $map: {
              input: {
                $reduce: {
                  input: "$items",
                  initialValue: [],
                  in: {
                    $concatArrays: ["$$value", "$$this"],
                  },
                },
              },
              as: "item",
              in: "$$item.quantity",
            },
          },
        },
      },
    },
    {
      $sort: {
        lastOrderDate: -1,
      },
    },
  );

  const [customers, total] = await Promise.all([
    OrderModel.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
    OrderModel.aggregate([
      ...pipeline,
      {
        $count: "total",
      },
    ]),
  ]);

  const totalCount = total[0]?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: customers,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

const getOrdersForExport = async (orderIds) => {
  const filter =
    Array.isArray(orderIds) && orderIds.length > 0
      ? { orderId: { $in: orderIds } }
      : {}; // empty/omitted => sab orders

  const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).lean();

  return orders;
};

module.exports = {
  getOrderHistory,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  updateOrderDetails,
  deleteOrder,
  getCustomerOrderStats,
  getOrdersForExport,
};
