const StorefrontSettings = require("../models/StorefrontSettingsModel");
const { AppError } = require("../utils/AppError");

const DEFAULT_MARQUEE_TEXT = "Free Shipping & a Free Gift on Orders Above Rs 10,000";

const readSettings = async () => {
  const settings = await StorefrontSettings.findOne({ key: "global" }).lean();
  return { marqueeText: settings?.marqueeText || DEFAULT_MARQUEE_TEXT };
};

exports.getPublicSettings = async (_req, res, next) => {
  try {
    res.set("Cache-Control", "no-store").json({ success: true, data: await readSettings() });
  } catch (error) { next(error); }
};

exports.getAdminSettings = async (_req, res, next) => {
  try {
    res.set("Cache-Control", "no-store").json({ success: true, data: await readSettings() });
  } catch (error) { next(error); }
};

exports.updateAdminSettings = async (req, res, next) => {
  try {
    const marqueeText = typeof req.body.marqueeText === "string" ? req.body.marqueeText.trim() : "";
    if (!marqueeText) throw new AppError("Marquee text is required", 400);
    if (marqueeText.length > 160) throw new AppError("Marquee text must be 160 characters or fewer", 400);
    const settings = await StorefrontSettings.findOneAndUpdate(
      { key: "global" },
      { $set: { marqueeText }, $setOnInsert: { key: "global" } },
      { new: true, upsert: true, runValidators: true },
    );
    res.json({ success: true, data: { marqueeText: settings.marqueeText } });
  } catch (error) { next(error); }
};
