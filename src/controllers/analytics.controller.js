const { AnalyticsSession } = require("../models/AnalyticsSessionModel");
const { OrderModel } = require("../models/OrderModel");
const { AbandonedCheckout } = require("../models/AbandonedCheckoutModel");

const clean = (value, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";

const sourceFrom = (referrer, explicitSource) => {
  if (explicitSource) return clean(explicitSource, 100);
  if (!referrer || referrer === "Direct") return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("google.")) return "Google";
    if (host.includes("facebook.com")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("tiktok.com")) return "TikTok";
    return host;
  } catch { return "Other"; }
};

const track = async (req, res) => {
  try {
    const requestOrigin = `${req.headers.origin || ""} ${req.headers.referer || ""} ${req.headers.host || ""}`;
    const isLocalRequest = /(^|[/:.])localhost([/:]|$)|127\.0\.0\.1|\[::1\]/i.test(requestOrigin);
    if (process.env.NODE_ENV !== "production" || isLocalRequest) {
      return res.json({ success: true, tracked: false });
    }
    const { sessionId, visitorId } = req.body || {};
    if (!/^[a-zA-Z0-9-]{10,100}$/.test(sessionId || "") ||
        !/^[a-zA-Z0-9-]{10,100}$/.test(visitorId || "")) {
      return res.status(400).json({ success: false, message: "Invalid analytics identity" });
    }
    const path = clean(req.body.path, 300);
    if (!path || path.startsWith("/admin")) return res.json({ success: true, tracked: false });

    const referrer = clean(req.body.referrer) || "Direct";
    const country = clean(req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"], 80) || "Unknown";
    const city = clean(req.headers["x-vercel-ip-city"], 100) || "Unknown";
    const now = new Date();
    const source = sourceFrom(referrer, req.body.source);
    await AnalyticsSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          visitorId,
          lastSeenAt: now,
          device: ["mobile", "tablet", "desktop"].includes(req.body.device) ? req.body.device : "desktop",
          ...(path === "/checkout" ? { checkoutStarted: true } : {}),
        },
        $setOnInsert: {
          firstSeenAt: now, landingPage: path, referrer, source,
          campaign: clean(req.body.campaign, 150), country, city,
        },
        $push: { pages: { $each: [{ path, title: clean(req.body.title, 200), viewedAt: now }], $slice: -200 } },
      },
      { upsert: true, new: true },
    );
    return res.json({ success: true, tracked: true });
  } catch (error) {
    console.error("analytics track error:", error);
    return res.status(500).json({ success: false, message: "Tracking failed" });
  }
};

const dateRange = (req) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  return { start, end, days };
};

const report = async (req, res) => {
  try {
    const { start, end, days } = dateRange(req);
    const match = { firstSeenAt: { $gte: start, $lte: end } };
    const orderMatch = { createdAt: { $gte: start, $lte: end } };
    const [summary, pages, sources, devices, countries, daily, orders, abandoned] = await Promise.all([
      AnalyticsSession.aggregate([{ $match: match }, { $group: { _id: null, sessions: { $sum: 1 }, visitors: { $addToSet: "$visitorId" }, checkouts: { $sum: { $cond: ["$checkoutStarted", 1, 0] } }, pageViews: { $sum: { $size: "$pages" } } } }]),
      AnalyticsSession.aggregate([{ $match: match }, { $unwind: "$pages" }, { $group: { _id: "$pages.path", views: { $sum: 1 }, visitors: { $addToSet: "$visitorId" } } }, { $project: { page: "$_id", views: 1, visitors: { $size: "$visitors" }, _id: 0 } }, { $sort: { views: -1 } }, { $limit: 20 }]),
      AnalyticsSession.aggregate([{ $match: match }, { $group: { _id: "$source", sessions: { $sum: 1 } } }, { $project: { name: "$_id", sessions: 1, _id: 0 } }, { $sort: { sessions: -1 } }, { $limit: 15 }]),
      AnalyticsSession.aggregate([{ $match: match }, { $group: { _id: "$device", sessions: { $sum: 1 } } }, { $project: { name: "$_id", sessions: 1, _id: 0 } }]),
      AnalyticsSession.aggregate([{ $match: match }, { $group: { _id: "$country", sessions: { $sum: 1 } } }, { $project: { name: "$_id", sessions: 1, _id: 0 } }, { $sort: { sessions: -1 } }, { $limit: 10 }]),
      AnalyticsSession.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$firstSeenAt" } }, sessions: { $sum: 1 }, visitors: { $addToSet: "$visitorId" }, checkouts: { $sum: { $cond: ["$checkoutStarted", 1, 0] } } } }, { $project: { date: "$_id", sessions: 1, visitors: { $size: "$visitors" }, checkouts: 1, _id: 0 } }, { $sort: { date: 1 } }]),
      OrderModel.countDocuments(orderMatch),
      AbandonedCheckout.countDocuments({ createdAt: { $gte: start, $lte: end }, status: { $ne: "completed" } }),
    ]);
    const s = summary[0] || { sessions: 0, visitors: [], checkouts: 0, pageViews: 0 };
    return res.json({ success: true, days, visitors: s.visitors.length, sessions: s.sessions, pageViews: s.pageViews, checkoutStarted: s.checkouts, orders, abandoned, checkoutRate: s.sessions ? Number((s.checkouts * 100 / s.sessions).toFixed(1)) : 0, conversionRate: s.sessions ? Number((orders * 100 / s.sessions).toFixed(1)) : 0, pages, sources, devices, countries, daily });
  } catch (error) {
    console.error("analytics report error:", error);
    return res.status(500).json({ success: false, message: "Unable to load analytics" });
  }
};

module.exports = { track, report };
