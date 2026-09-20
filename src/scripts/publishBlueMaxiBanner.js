const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const cloudinary = require("../config/cloudinary");
const connectDB = require("../config/db");
const Banner = require("../models/BannerModel");

const assetDir = path.resolve(__dirname, "../../../output/imagegen/blue-maxi-banner");
const sources = {
  desktop: path.join(assetDir, "hero-desktop.png"),
  mobile: path.join(assetDir, "hero-mobile-1080x1920.png"),
};
const title = "Blue Floral Maxi";
async function main() {
  if (!process.env.MONGO_URI || !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("MongoDB and Cloudinary credentials are required.");
  }
  for (const file of Object.values(sources)) {
    if (!fs.existsSync(file)) throw new Error("Missing image: " + file);
  }
  const reuse = process.argv.includes("--reuse-uploaded");
  const images = {};
  for (const variant of ["desktop", "mobile"]) {
    const publicId = "banners/blue-floral-maxi-" + variant;
    const result = reuse
      ? await cloudinary.api.resource(publicId)
      : await cloudinary.uploader.upload(sources[variant], {
          public_id: publicId, overwrite: true, invalidate: true, resource_type: "image",
        });
    if (!result.secure_url) throw new Error("Cloudinary URL missing for " + variant);
    images[variant] = { url: result.secure_url, publicId: result.public_id };
    console.log((reuse ? "Verified " : "Uploaded ") + variant + " on Cloudinary");
  }
  await connectDB();
  const existing = await Banner.findOne({ title });
  const banner = await Banner.findOneAndUpdate(
    { title },
    { $set: {
      title, href: "/shop/blue-floral-printed-maxi-with-organza-dupatta-2-piece",
      order: 1, textless: true, desktop: images.desktop, mobile: images.mobile,
    } },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  if (!existing) {
    await Banner.updateMany({ _id: { $ne: banner._id }, order: { $gte: 1 } }, { $inc: { order: 1 } });
  }
  const ordered = await Banner.find().sort({ order: 1, createdAt: 1 }).lean();
  if (String(ordered[1]?._id) !== String(banner._id) ||
      !banner.textless || !banner.desktop?.url || !banner.mobile?.url) {
    throw new Error("Maxi banner failed homepage order or image verification.");
  }
  console.log(JSON.stringify({ id: String(banner._id), order: banner.order,
    textless: banner.textless, desktop: banner.desktop.url, mobile: banner.mobile.url }));
}
main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());

