const mongoose = require("mongoose");
const Category = require("../models/CategoryModel");
const Product = require("../models/ProductModel");
const cloudinary = require("../config/cloudinary");
const { AppError } = require("../utils/AppError");
const { slugify } = require("../config/slugify");

const DEFAULT_CATEGORIES = [
  { name: "Western Fashion", slug: "western", image: { url: "/category-western.avif", publicId: "" }, order: 1 },
  { name: "Top & Jeans", slug: "top-jeans", image: { url: "/category-top-jeans.avif", publicId: "" }, order: 2 },
  { name: "Pakistani Fashion", slug: "fashion", image: { url: "/category-fashion.avif", publicId: "" }, order: 3 },
  { name: "Maxi", slug: "maxi", image: { url: "/category-maxi.avif", publicId: "" }, order: 4 },
];

async function ensureDefaults() {
  if (await Category.exists({})) return;
  await Category.bulkWrite(DEFAULT_CATEGORIES.map((category) => ({
    updateOne: { filter: { slug: category.slug }, update: { $setOnInsert: category }, upsert: true },
  })));
}

const upload = (file) => new Promise((resolve, reject) => {
  cloudinary.uploader.upload_stream(
    { folder: "categories", resource_type: "image" },
    (error, result) => {
      if (error || !result) return reject(error || new Error("Image upload failed"));
      resolve({ url: result.secure_url, publicId: result.public_id });
    },
  ).end(file.buffer);
});

async function removeCloudinaryImage(image) {
  if (!image?.publicId) return;
  try { await cloudinary.uploader.destroy(image.publicId); }
  catch (error) { console.error("Category image cleanup failed", error); }
}

function validate(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const requestedSlug = typeof body.slug === "string" ? body.slug.trim() : "";
  const slug = slugify(requestedSlug || name);
  const order = Number(body.order ?? 0);
  const status = body.status === "inactive" ? "inactive" : "active";
  if (!name || name.length > 80) throw new AppError("Category name must be between 1 and 80 characters", 400);
  if (!slug) throw new AppError("A valid category slug is required", 400);
  if (!Number.isSafeInteger(order) || order < 0) throw new AppError("Order must be a non-negative integer", 400);
  return { name, slug, order, status };
}

exports.listPublicCategories = async (_req, res, next) => {
  try {
    await ensureDefaults();
    const data = await Category.find({ status: "active" }).sort({ order: 1, createdAt: 1 }).lean();
    res.set("Cache-Control", "no-store").json({ success: true, data });
  } catch (error) { next(error); }
};

exports.listAdminCategories = async (_req, res, next) => {
  try {
    await ensureDefaults();
    const data = await Category.find().sort({ order: 1, createdAt: 1 }).lean();
    res.set("Cache-Control", "no-store").json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createCategory = async (req, res, next) => {
  let uploaded;
  try {
    const values = validate(req.body);
    if (!req.file) throw new AppError("Category image is required", 400);
    if (await Category.exists({ slug: values.slug })) throw new AppError("A category with this name or slug already exists", 409);
    uploaded = await upload(req.file);
    const category = await Category.create({ ...values, image: uploaded });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (uploaded) await removeCloudinaryImage(uploaded);
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  let uploaded;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid category ID", 400);
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError("Category not found", 404);
    const values = validate(req.body);
    const duplicate = await Category.exists({ slug: values.slug, _id: { $ne: category._id } });
    if (duplicate) throw new AppError("A category with this name or slug already exists", 409);
    const previousSlug = category.slug;
    const previousImage = category.image?.toObject?.() || category.image;
    if (req.file) uploaded = await upload(req.file);
    category.set({ ...values, ...(uploaded ? { image: uploaded } : {}) });
    await category.save();
    if (previousSlug !== values.slug) {
      await Product.updateMany(
        { category: previousSlug },
        { $set: { "category.$[item]": values.slug } },
        { arrayFilters: [{ item: previousSlug }] },
      );
    }
    if (uploaded) await removeCloudinaryImage(previousImage);
    res.json({ success: true, data: category });
  } catch (error) {
    if (uploaded) await removeCloudinaryImage(uploaded);
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid category ID", 400);
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError("Category not found", 404);
    const productCount = await Product.countDocuments({ category: category.slug });
    if (productCount) {
      throw new AppError("This category is used by " + productCount + " product(s). Move those products before deleting it.", 409);
    }
    await category.deleteOne();
    await removeCloudinaryImage(category.image);
    res.json({ success: true });
  } catch (error) { next(error); }
};