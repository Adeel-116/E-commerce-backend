const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { track, report } = require("../controllers/analytics.controller");
const { protect, protectAdmin } = require("../middleware/auth");

const router = Router();
const analyticsLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
router.post("/analytics/track", analyticsLimiter, track);
router.get("/admin/visitor-analytics", protect, protectAdmin, report);
module.exports = router;
 