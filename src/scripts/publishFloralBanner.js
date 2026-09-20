const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const cloudinary = require("../config/cloudinary");
const connectDB = require("../config/db");
const Banner = require("../models/BannerModel");

const assetDir = path.resolve(__dirname, "../../../output/imagegen/desktop-banner");
const title = "Floral Editorial";
const sources = {
    desktop: path.join(assetDir, "hero-desktop.png"),
    mobile: path.join(assetDir, "hero-mobile-1080x1920.png"),
};
async function main() {
    if (!process.env.MONGO_URI || !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("MongoDB and Cloudinary credentials are required.");
    }
    for (const file of Object.values(sources)) {
        if (!fs.existsSync(file)) throw new Error("Missing banner image: " + file);
    }
    const reuse = process.argv.includes("--reuse-uploaded");
    const images = {};
    for (const variant of["desktop", "mobile"]) {
        const publicId = "banners/floral-editorial-" + variant;
        const result = reuse ?
            await cloudinary.api.resource(publicId) :
            await cloudinary.uploader.upload(sources[variant], {
                public_id: publicId,
                overwrite: true,
                invalidate: true,
                resource_type: "image",
            });
        if (!result.secure_url) throw new Error("Upload failed for " + variant);
        images[variant] = { url: result.secure_url, publicId: result.public_id };
        console.log((reuse ? "Verified " : "Uploaded ") + variant + " on Cloudinary");
    }
    await connectDB();
    const existing = await Banner.findOne({ title });
    const banner = await Banner.findOneAndUpdate({ title }, {
        $set: {
            title,
            href: "/shop?category=fashion",
            order: 0,
            textless: true,
            desktop: images.desktop,
            mobile: images.mobile
        }
    }, { upsert: true, returnDocument: "after", runValidators: true }, );
    if (!existing) {
        await Banner.updateMany({ _id: { $ne: banner._id }, order: { $gte: 0 } }, { $inc: { order: 1 } });
    }
    const first = await Banner.findOne().sort({ order: 1, createdAt: 1 }).lean();
    if (String(first ?._id) !== String(banner._id) || !first.desktop ?.url || !first.mobile ?.url) {
        throw new Error("New banner is not first in display order.");
    }
    console.log(JSON.stringify({
        id: String(banner._id),
        order: banner.order,
        textless: banner.textless,
        desktop: banner.desktop.url,
        mobile: banner.mobile.url
    }));
}
main().catch(error => { console.error(error);
        process.exitCode = 1; })
    .finally(() => mongoose.disconnect());