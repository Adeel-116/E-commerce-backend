const { AbandonedCheckout } = require("../models/AbandonedCheckoutModel");
const { Cart } = require("../models/AddtoCartModel");

const clean = (value, max = 300) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const trackCheckout = async (req, res) => {
  try {
    const requestOrigin = `${req.headers.origin || ""} ${req.headers.referer || ""} ${req.headers.host || ""}`;
    const isLocalRequest = /(^|[/:.])localhost([/:]|$)|127\.0\.0\.1|\[::1\]/i.test(requestOrigin);
    if (process.env.NODE_ENV !== "production" || isLocalRequest) {
      return res.status(200).json({ success: true, tracked: false });
    }
    const { ownerId, ownerType } = req.cartOwner;
    const cart = await Cart.findOne({ ownerId }).populate(
      "items.productId",
      "title images price",
    );
    if (!cart?.items?.length) {
      return res.status(200).json({ success: true, tracked: false });
    }

    const items = cart.items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId._id,
        title: item.productId.title,
        image: item.productId.images?.[0] || "",
        size: item.size,
        color: item.color ?? null,
        stitching: item.stitching ?? null,
        price: item.productId.price || 0,
        quantity: item.quantity || 1,
      }));
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const body = req.body || {};

    const checkout = await AbandonedCheckout.findOneAndUpdate(
      { ownerId },
      {
        $set: {
          ownerType,
          customer: {
            firstName: clean(body.firstName, 80),
            lastName: clean(body.lastName, 80),
            email: clean(body.email, 160).toLowerCase(),
            phone: clean(body.phone, 40),
          },
          shippingAddress: {
            line1: clean(body.line1),
            line2: clean(body.line2),
            city: clean(body.city, 100),
            state: clean(body.state, 100),
            postalCode: clean(body.postalCode, 30),
            country: clean(body.country, 100) || "Pakistan",
          },
          items,
          subtotal,
          lastActivityAt: new Date(),
        },
        $setOnInsert: { status: "open" },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({ success: true, tracked: true, id: checkout._id });
  } catch (error) {
    console.error("trackCheckout error:", error);
    return res.status(500).json({ success: false, message: "Unable to track checkout" });
  }
};

const listCheckouts = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filter = { status: { $ne: "completed" } };
    const [records, total] = await Promise.all([
      AbandonedCheckout.find(filter)
        .sort({ lastActivityAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AbandonedCheckout.countDocuments(filter),
    ]);
    const abandonedBefore = Date.now() - 30 * 60 * 1000;
    const data = records.map((record) => ({
      ...record,
      isAbandoned: new Date(record.lastActivityAt).getTime() <= abandonedBefore,
    }));
    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load checkouts" });
  }
};

const updateCheckout = async (req, res) => {
  try {
    const allowedStatuses = ["open", "contacted", "recovered", "dismissed"];
    const status = allowedStatuses.includes(req.body.status) ? req.body.status : "open";
    const record = await AbandonedCheckout.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "customer.firstName": clean(req.body.firstName, 80),
          "customer.lastName": clean(req.body.lastName, 80),
          "customer.email": clean(req.body.email, 160).toLowerCase(),
          "customer.phone": clean(req.body.phone, 40),
          notes: clean(req.body.notes, 2000),
          status,
        },
      },
      { new: true, runValidators: true },
    );
    if (!record) return res.status(404).json({ success: false, message: "Checkout not found" });
    return res.json({ success: true, data: record });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to update checkout" });
  }
};

const deleteCheckouts = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ success: false, message: "Select at least one record" });
    const result = await AbandonedCheckout.deleteMany({ _id: { $in: ids } });
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch {
    return res.status(400).json({ success: false, message: "Unable to delete checkout records" });
  }
};

module.exports = { trackCheckout, listCheckouts, updateCheckout, deleteCheckouts };
