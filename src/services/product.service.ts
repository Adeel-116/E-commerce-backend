import fs from "fs";
import { Transform } from "stream";
import csvParser from "csv-parser";
import Product from "../models/ProductModel";
import { Discount } from "../models/DiscountModel";
import { AppError } from "../utils/AppError";
import { slugify } from "../config/slugify";
import type {
  ProductFilterQuery,
  CreateProductInput,
  UpdateProductInput,
  DeleteProductQuery,
  FormattedError,
  SaveResult,
} from "../types";

// ── Slug ───────────────────────────────────────────────────

export const generateUniqueSlug = async (
  title: string,
  excludeId?: string,
  usedSlugs?: Set<string>
): Promise<string> => {
  const base = slugify(title);
  let slug = base;
  let counter = 1;
  for (; ;) {
    if (usedSlugs?.has(slug)) {
      slug = `${base}-${counter++}`;
      continue;
    }
    const query: Record<string, unknown> = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Product.exists(query);
    if (!exists) break;
    slug = `${base}-${counter++}`;
  }
  usedSlugs?.add(slug);
  return slug;
};

// ── Filter helpers ────────────────────────────────────────

const buildMongoFilter = (q: ProductFilterQuery) => {
  const filter: Record<string, unknown> = {};
  if (q.title) filter.title = { $regex: q.title, $options: "i" };
  if (q.stock !== undefined) filter.stock = q.stock === "true";
  if (q.status) filter.status = q.status;
  if (q.category) filter.category = { $in: [q.category] };
  if (q.size) filter.sizes = { $in: [q.size] };
  if (q.minPrice || q.maxPrice) {
    const r: Record<string, number> = {};
    if (q.minPrice) r.$gte = Number(q.minPrice);
    if (q.maxPrice) r.$lte = Number(q.maxPrice);
    filter.price = r;
  }
  return filter;
};

const buildSort = (sort?: string): Record<string, 1 | -1> => {
  switch (sort) {
    case "price-asc": return { price: 1 };
    case "price-desc": return { price: -1 };
    case "oldest": return { createdAt: 1 };
    default: return { createdAt: -1 };
  }
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

type ActiveDiscount = {
  _id: unknown;
  name: string;
  type: string;
  valueType: string;
  value: number;
  productIds: unknown[];
};

const attachDiscount = (productId: string, discounts: ActiveDiscount[]) => {
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

export const filterProducts = async (q: ProductFilterQuery) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(50000, Math.max(1, Number(q.limit) || 12));
  const skip = (page - 1) * limit;
  const filter = buildMongoFilter(q);
  const sort = buildSort(q.sort);
  const [products, total, discounts] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
    getActiveDiscounts(),
  ]);
  const data = products.map((p) => ({
    ...p,
    activeDiscount: attachDiscount(p._id.toString(), discounts as ActiveDiscount[]),
  }));
  return { data, total, page, totalPages: Math.ceil(total / limit) };
};

export const getTitleSuggestions = async (search: string, limit: number) => {
  if (!search) return [];
  return Product.find({ title: { $regex: search, $options: "i" } })
    .select("title slug")
    .limit(limit)
    .lean();
};

export const getProductById = async (id?: string, slug?: string) => {
  if (!id && !slug) throw new AppError("id or slug is required", 400);
  const query = id ? { _id: id } : { slug };
  const [product, discounts] = await Promise.all([
    Product.findOne(query).lean(),
    getActiveDiscounts(),
  ]);
  if (!product) throw new AppError("Product not found", 404);
  return {
    ...product,
    activeDiscount: attachDiscount(product._id.toString(), discounts as ActiveDiscount[]),
  };
};

// ── Admin CRUD ────────────────────────────────────────────────────────────────

const getLastProductId = async (): Promise<number> => {
  const last = await Product.findOne({ productId: { $gt: 0 } })
    .sort({ productId: -1 })
    .select("productId")
    .lean();
  return (last as { productId?: number } | null)?.productId ?? 0;
};

export const createProduct = async (body: CreateProductInput) => {
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
    status: (body.status ?? "active") as "active" | "inactive",
    isNew: body.isNew === "true" || body.isNew === true,
    category: body.category ?? [],
    sizes: body.sizes ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

export const updateProduct = async (id: string, body: UpdateProductInput) => {
  const updates: Record<string, unknown> = {};
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
  if (body.category !== undefined) updates.category = body.category;
  if (body.sizes !== undefined) updates.sizes = body.sizes;

  const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!product) throw new AppError("Product not found", 404);
  return product;
};

export const deleteProduct = async (q: DeleteProductQuery) => {
  if (q.deleteAll === "true") {
    const r = await Product.deleteMany({});
    return { mode: "all" as const, deletedCount: r.deletedCount };
  }
  if (q.ids) {
    const ids = q.ids.split(",").map((s) => s.trim());
    const r = await Product.deleteMany({ _id: { $in: ids } });
    return { mode: "multiple" as const, deletedCount: r.deletedCount };
  }
  if (q.id) {
    const p = await Product.findByIdAndDelete(q.id);
    if (!p) throw new AppError("Product not found", 404);
    return { mode: "single" as const };
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
    transform(chunk: Buffer, _enc, cb) {
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

export const bulkImportFromCSV = async (filePath: string): Promise<SaveResult> => {
  const rows: Record<string, string>[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(stripBom())
        .pipe(csvParser())
        .on("data", (row: Record<string, string>) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });
  } finally {
    fs.unlink(filePath, () => { });
  }

  if (rows.length === 0) throw new AppError("CSV is empty", 400);

  let nextId = (await getLastProductId()) + 1;
  const docs: Record<string, unknown>[] = [];
  const usedSlugs = new Set<string>();

  const splitList = (value: string) =>
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
      stock: (row.stock || row.Stock || "true").toLowerCase() !== "false",
      status: (row.status || row.Status || "active").toLowerCase(),
    });
  }

  if (docs.length === 0) throw new AppError("No valid rows found in CSV", 400);

  let insertedCount = 0;
  let errors: FormattedError[] = [];

  try {
    const inserted = await Product.insertMany(docs, { ordered: false });
    insertedCount = inserted.length;
  } catch (err: unknown) {
    const e = err as {
      writeErrors?: Array<{ index: number; code: number; errmsg: string; getOperation?: () => unknown }>;
      insertedDocs?: unknown[];
    };
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
