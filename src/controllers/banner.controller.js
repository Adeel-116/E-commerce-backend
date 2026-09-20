const mongoose = require("mongoose");
const Banner = require("../models/BannerModel");
const cloudinary = require("../config/cloudinary");
const { AppError } = require("../utils/AppError");

const upload = (file) => new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: "banners", resource_type: "image" }, (error, result) => {
        if (error || !result) return reject(error || new Error("Image upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
    }).end(file.buffer);
});

const cleanup = async(images) => {
    const results = await Promise.allSettled(images.map((image) => cloudinary.uploader.destroy(image.publicId)));
    results.forEach((result) => {
        if (result.status === "rejected") console.error("Banner image cleanup failed", result.reason);
    });
};

exports.listBanners = async(_req, res, next) => {
    try {
        const banners = await Banner.find().sort({ order: 1, createdAt: 1 });
        res.set("Cache-Control", "no-store").json({
            success: true,
            data: banners.map((banner) => ({
                _id: banner.id,
                title: banner.title,
                href: banner.href,
                order: banner.order,
                textless: banner.textless,
                desktop: { url: banner.desktop.url },
                mobile: { url: banner.mobile.url },
            }))
        });
    } catch (error) { next(error); }
};

exports.saveBanner = async(req, res, next) => {
    const uploaded = [];
    let committed = false;
    try {
        let banner;
        if (req.params.id) {
            if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid banner ID", 400);
            banner = await Banner.findById(req.params.id);
            if (!banner) throw new AppError("Banner not found", 404);
        }
        const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
        const href = typeof req.body.href === "string" ? req.body.href.trim() : "/shop";
        const order = Number(req.body.order ?? 0);
        if (!title || title.length > 150) throw new AppError("Title must be between 1 and 150 characters", 400);
        if (!/^\/(?!\/)/.test(href) || /[\\\s]/.test(href)) throw new AppError("Link must be a site path such as /shop", 400);
        if (!Number.isSafeInteger(order) || order < 0) throw new AppError("Order must be a non-negative integer", 400);
        if (!banner && (!req.files?.desktop?.[0] || !req.files?.mobile?.[0])) {
            throw new AppError("Both desktop and mobile images are required", 400);
        }
        const values = { title, href, order };
        if (req.body.textless !== undefined) values.textless = req.body.textless === "true" || req.body.textless === true;
        const replaced = [];
        for (const variant of["desktop", "mobile"]) {
            const file = req.files?.[variant]?.[0];
            if (file) {
                const image = await upload(file);
                uploaded.push(image);
                values[variant] = image;
                if (banner) replaced.push(banner[variant]);
            }
        }
        if (banner) {
            banner.set(values);
            await banner.save();
        } else banner = await Banner.create(values);
        committed = true;
        await cleanup(replaced);
        res.status(req.params.id ? 200 : 201).json({ success: true, data: banner });
    } catch (error) {
        if (!committed) await cleanup(uploaded);
        next(error);
    }
};

exports.deleteBanner = async(req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid banner ID", 400);
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) throw new AppError("Banner not found", 404);
        await cleanup([banner.desktop, banner.mobile]);
        res.json({ success: true });
    } catch (error) { next(error); }
};
