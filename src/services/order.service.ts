import { OrderModel } from "../models/OrderModel";
import { AppError } from "../utils/AppError";

const ORDER_STATUSES = [
  "processing",
  "preparation",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  processing: ["preparation", "cancelled"],
  preparation: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export const getOrderHistory = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    OrderModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OrderModel.countDocuments({ userId }),
  ]);
  return { orders, total, page, totalPages: Math.ceil(total / limit) };
};

export const getOrderById = async (orderId: string, userId: string) => {
  const order = await OrderModel.findOne({ orderId, userId }).lean();
  if (!order) throw new AppError("Order not found", 404);
  return order;
};

export const getAllOrders = async (page: number, limit: number, status?: string) => {
  const skip = (page - 1) * limit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter = (status ? { status } : {}) as any;
  const [orders, total] = await Promise.all([
    OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OrderModel.countDocuments(filter),
  ]);
  return { orders, pagination: { total, page, totalPages: Math.ceil(total / limit) } };
};

export const updateOrderStatus = async (orderId: string, newStatus: string) => {
  if (!ORDER_STATUSES.includes(newStatus as OrderStatus)) {
    throw new AppError(`Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}`, 400);
  }
  const order = await OrderModel.findOne({ orderId });
  if (!order) throw new AppError("Order not found", 404);
  const previousStatus = order.status as OrderStatus;
  const allowed = ALLOWED_TRANSITIONS[previousStatus] ?? [];
  if (!allowed.includes(newStatus as OrderStatus)) {
    throw new AppError(`Cannot transition from "${previousStatus}" to "${newStatus}"`, 400);
  }

  (order as any).status = newStatus;
  await order.save();
  return { order, previousStatus };
};

const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const updatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
  if (!PAYMENT_STATUSES.includes(newPaymentStatus as PaymentStatus)) {
    throw new AppError(`Invalid payment status. Must be one of: ${PAYMENT_STATUSES.join(", ")}`, 400);
  }
  const order = await OrderModel.findOne({ orderId });
  if (!order) throw new AppError("Order not found", 404);

  const previousPaymentStatus = order.payment.status;
  order.payment.status = newPaymentStatus as PaymentStatus;
  order.payment.paidAt = newPaymentStatus === "paid" ? new Date() : undefined;
  await order.save();

  return { order, previousPaymentStatus };
};

export const deleteOrder = async (orderId: string) => {
  if (!orderId) throw new AppError("orderId is required", 400);
  const result = await OrderModel.deleteOne({ orderId });
  if (result.deletedCount === 0) throw new AppError("Order not found", 404);
};



export const getCustomerOrderStats = async ({
  page = 1,
  limit = 10,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
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

  const pipeline: any[] = [];

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
    }
  );

  const [customers, total] = await Promise.all([
    OrderModel.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
    ]),
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
