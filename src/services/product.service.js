const fs = require("fs");
const { Transform } = require("stream");
const { Types } = require("mongoose");
const csvParser = require("csv-parser");
const Product = require("../models/ProductModel");
const { Discount } = require("../models/DiscountModel");
const { AppError } = require("../utils/AppError");
const { slugify } = require("../config/slugify");

// ── Slug ───────────────────────────────────────────────────

const generateUniqueSlug = async (
  title,
  excludeId,
  usedSlugs
) => {
  const base = slugify(title);
  let slug = base;
  let counter = 1;
  for (; ;) {
    if (usedSlugs?.has(slug)) {
      slug = `${base}-${counter++}`;
      continue;
    }
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Product.exists(query);
    if (!exists) break;
    slug = `${base}-${counter++}`;
  }
  usedSlugs?.add(slug);
  return slug;
};

// ── Filter helpers ────────────────────────────────────────

const buildMongoFilter = (q) => {
  const filter = {};
  if (q.title) filter.title = { $regex: q.title, $options: "i" };
  if (q.stock !== undefined) filter.stock = q.stock === "true";
  if (q.status) filter.status = q.status;
  if (q.category) filter.category = { $in: [q.category] };
  if (q.size) filter.sizes = { $in: [q.size] };
  if (q.isBestSeller) filter.isBestSeller = q.isBestSeller === "true";
  if (q.minPrice || q.maxPrice) {
    const r = {};
    if (q.minPrice) r.$gte = Number(q.minPrice);
    if (q.maxPrice) r.$lte = Number(q.maxPrice);
    filter.price = r;
  }
  return filter;
};

// displayOrder defaults to 0 for products that haven't been manually
// ranked yet. Sorting displayOrder ascending puts those unranked products
// BEFORE anything explicitly numbered 1, 2, 3... which is backwards — 0
// means "no preference", so it must sort to the end, not the front.
// rankSortField remaps 0 -> Infinity in an $addFields stage so ranked
// products (1, 2, 3...) come first in order, with unranked ones trailing
// after; usesRankField tells callers whether that stage is needed.
const buildSort = (sort) => {
  switch (sort) {
    case "price-asc": return { sort: { price: 1 }, usesRankField: false };
    case "price-desc": return { sort: { price: -1 }, usesRankField: false };
    case "oldest": return { sort: { _rankOrder: 1, _id: 1 }, usesRankField: true };
    // "Best Selling" (Shop page default) and the homepage Best Sellers grid
    // both fall through here — ranked products (displayOrder 1, 2, 3...)
    // show first in ascending order, unranked ones (displayOrder 0) trail
    // after. Tie-break uses _id (not createdAt) because several existing
    // products have no createdAt set, which made their relative order
    // unstable — _id always exists and already encodes creation time.
    default: return { sort: { _rankOrder: 1, _id: -1 }, usesRankField: true };
  }
};

const RANK_ORDER_STAGE = {
  $addFields: {
    _rankOrder: {
      $cond: [{ $eq: ["$displayOrder", 0] }, Infinity, "$displayOrder"],
    },
  },
};

const getActiveCategories = async () => {
  return Product.distinct("category", { status: "active" });
};

const now = () => new Date();

// Only one discount can be active system-wide, so this returns at most one document.
const getActiveDiscounts = async () =>
  Discount.find({
    isActive: true,
    type: { $in: ["product", "all_products"] },
    $or: [{ startDate: null }, { startDate: { $lte: now() } }],
    $and: [{ $or: [{ endDate: null }, { endDate: { $gte: now() } }] }],
  }).lean();

const attachDiscount = (productId, discounts) => {
  const product = discounts.find(
    (d) =>
      d.type === "product" &&
      d.productIds.some((pid) => pid?.toString() === productId)
  );
  const global = discounts.find((d) => d.type === "all_products");
  const applicable = product ?? global ?? null;
  if (!applicable) return null;
  return {
    discountId: applicable._id,
    name: applicable.name,
    valueType: applicable.valueType,
    value: applicable.value,
  };
};

// ── Public queries ────────────────────────────────────────────────────────────

const filterProducts = async (q) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(50000, Math.max(1, Number(q.limit) || 12));
  const skip = (page - 1) * limit;
  const filter = buildMongoFilter(q);
  const { sort, usesRankField } = buildSort(q.sort);
  const pipeline = [
    { $match: filter },
    ...(usesRankField ? [RANK_ORDER_STAGE] : []),
    { $sort: sort },
    { $skip: skip },
    { $limit: limit },
  ];
  const [products, total, discounts] = await Promise.all([
    Product.aggregate(pipeline),
    Product.countDocuments(filter),
    getActiveDiscounts(),
  ]);
  const data = products.map((p) => ({
    ...p,
    activeDiscount: attachDiscount(p._id.toString(), discounts),
  }));
  return { data, total, page, totalPages: Math.ceil(total / limit) };
};

const getTitleSuggestions = async (search, limit) => {
  if (!search) return [];
  return Product.find({ title: { $regex: search, $options: "i" } })
    .select("title slug")
    .limit(limit)
    .lean();
};

const getSimilarProducts = async (excludeId, limit) => {
  const [products, discounts] = await Promise.all([
    Product.aggregate([
      {
        $match: {
          status: "active",
          showInYouMayAlsoLike: true,
          _id: { $ne: new Types.ObjectId(excludeId) },
        },
      },
      RANK_ORDER_STAGE,
      { $sort: { _rankOrder: 1, _id: -1 } },
      { $limit: limit },
    ]),
    getActiveDiscounts(),
  ]);
  return products.map((p) => ({
    ...p,
    activeDiscount: attachDiscount(p._id.toString(), discounts),
  }));
};

const getProductById = async (id, slug) => {
  if (!id && !slug) throw new AppError("id or slug is required", 400);
  const query = id ? { _id: id } : { slug };
  const [product, discounts] = await Promise.all([
    Product.findOne(query).lean(),
    getActiveDiscounts(),
  ]);
  if (!product) throw new AppError("Product not found", 404);
  return {
    ...product,
    activeDiscount: attachDiscount(product._id.toString(), discounts),
  };
};

// ── Admin CRUD ────────────────────────────────────────────────────────────────

const getLastProductId = async () => {
  const last = await Product.findOne({ productId: { $gt: 0 } })
    .sort({ productId: -1 })
    .select("productId")
    .lean();
  return last?.productId ?? 0;
};

const createProduct = async (body) => {
  if (!body.title) throw new AppError("Title is required", 400);
  const [slug, productId] = await Promise.all([
    generateUniqueSlug(body.title),
    getLastProductId().then((last) => last + 1),
  ]);
  return Product.create({
    productId,
    title: body.title,
    slug,
    description: body.description ?? "",
    images: body.images ?? [],
    price: Number(body.price) || 0,
    comparePrice: body.comparePrice ? Number(body.comparePrice) : null,
    stock: body.stock === "true" || body.stock === true,
    status: body.status ?? "active",
    isNew: body.isNew === "true" || body.isNew === true,
    isBestSeller: body.isBestSeller === "true" || body.isBestSeller === true,
    showInYouMayAlsoLike: body.showInYouMayAlsoLike === "true" || body.showInYouMayAlsoLike === true,
    category: body.category ?? [],
    sizes: body.sizes ?? [],
    colors: body.colors ?? [],
    displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : 0,
  });
};

const updateProduct = async (id, body) => {
  const updates = {};
  if (body.title !== undefined) {
    updates.title = body.title;
    updates.slug = await generateUniqueSlug(body.title, id);
  }
  if (body.description !== undefined) updates.description = body.description;
  if (body.images !== undefined) updates.images = body.images;
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.comparePrice !== undefined) {
    updates.comparePrice = body.comparePrice ? Number(body.comparePrice) : null;
  }
  if (body.stock !== undefined) updates.stock = body.stock === "true" || body.stock === true;
  if (body.status !== undefined) updates.status = body.status;
  if (body.isNew !== undefined) updates.isNew = body.isNew === "true" || body.isNew === true;
  if (body.isBestSeller !== undefined) {
    updates.isBestSeller = body.isBestSeller === "true" || body.isBestSeller === true;
  }
  if (body.showInYouMayAlsoLike !== undefined) {
    updates.showInYouMayAlsoLike = body.showInYouMayAlsoLike === "true" || body.showInYouMayAlsoLike === true;
  }
  if (body.category !== undefined) updates.category = body.category;
  if (body.sizes !== undefined) updates.sizes = body.sizes;
  if (body.colors !== undefined) updates.colors = body.colors;
  if (body.displayOrder !== undefined) updates.displayOrder = Number(body.displayOrder);

  const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!product) throw new AppError("Product not found", 404);
  return product;
};

const deleteProduct = async (q) => {
  if (q.deleteAll === "true") {
    const r = await Product.deleteMany({});
    return { mode: "all", deletedCount: r.deletedCount };
  }
  if (q.ids) {
    const ids = q.ids.split(",").map((s) => s.trim());
    const r = await Product.deleteMany({ _id: { $in: ids } });
    return { mode: "multiple", deletedCount: r.deletedCount };
  }
  if (q.id) {
    const p = await Product.findByIdAndDelete(q.id);
    if (!p) throw new AppError("Product not found", 404);
    return { mode: "single" };
  }
  throw new AppError("Provide id, ids, or deleteAll=true", 400);
};

// ── Bulk CSV import ───────────────────────────────────────────────────────────

// Excel's "CSV UTF-8" export prefixes the file with a BOM, which glues itself
// onto the first header name (e.g. "title" becomes "﻿title") and silently
// breaks every row lookup on that column.
const stripBom = () => {
  let seen = false;
  return new Transform({
    transform(chunk, _enc, cb) {
      if (!seen) {
        seen = true;
        if (chunk.length >= 3 && chunk[0] === 0xef && chunk[1] === 0xbb && chunk[2] === 0xbf) {
          chunk = chunk.subarray(3);
        }
      }
      cb(null, chunk);
    },
  });
};

const bulkImportFromCSV = async (filePath) => {
  const rows = [];

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(stripBom())
        .pipe(csvParser())
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });
  } finally {
    fs.unlink(filePath, () => { });
  }

  if (rows.length === 0) throw new AppError("CSV is empty", 400);

  let nextId = (await getLastProductId()) + 1;
  const docs = [];
  const usedSlugs = new Set();

  const splitList = (value) =>
    value.split(",").map((v) => v.trim()).filter(Boolean);

  for (const row of rows) {
    const title = (row.title || row.Title || "").trim();
    if (!title) continue;
    const slug = await generateUniqueSlug(title, undefined, usedSlugs);
    const comparePrice = Number(row.comparePrice || row.ComparePrice || 0);
    docs.push({
      productId: nextId++,
      title,
      slug,
      description: (row.description || row.Description || "").trim(),
      images: splitList(row.images || row.Images || ""),
      price: Number(row.price || row.Price || 0),
      comparePrice: comparePrice > 0 ? comparePrice : null,
      category: splitList(row.category || row.Category || "").map((c) => c.toLowerCase()),
      sizes: splitList(row.sizes || row.Sizes || "").map((s) => s.toUpperCase()),
      isNew: (row.isNew || row.IsNew || "false").toLowerCase() === "true",
      isBestSeller: (row.isBestSeller || row.IsBestSeller || "false").toLowerCase() === "true",
      stock: (row.stock || row.Stock || "true").toLowerCase() !== "false",
      status: (row.status || row.Status || "active").toLowerCase(),
    });
  }

  if (docs.length === 0) throw new AppError("No valid rows found in CSV", 400);

  let insertedCount = 0;
  let errors = [];

  try {
    const inserted = await Product.insertMany(docs, { ordered: false });
    insertedCount = inserted.length;
  } catch (err) {
    const e = err;
    if (!e.writeErrors) throw err;
    insertedCount = e.insertedDocs?.length ?? 0;
    errors = e.writeErrors.map((we) => ({
      index: we.index,
      message: we.errmsg ?? "Write error",
      code: we.code,
      failedDocument: we.getOperation?.() ?? docs[we.index],
    }));
  }

  return { insertedCount, errors };
};

module.exports = {
  generateUniqueSlug,
  filterProducts,
  getTitleSuggestions,
  getSimilarProducts,
  getProductById,
  getActiveCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportFromCSV,
};
