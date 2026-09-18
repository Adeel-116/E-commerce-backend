const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const cloudinary = require("../config/cloudinary");
const connectDB = require("../config/db");
const Product = require("../models/ProductModel");
const Category = require("../models/CategoryModel");

const input = path.resolve(__dirname, "../../../output/ethnc-western/western-fashion.json");
const progressPath = path.resolve(__dirname, "../../../output/ethnc-western/import-progress.json");
const products = JSON.parse(fs.readFileSync(input, "utf8").replace(/^\uFEFF/, "")).products.slice(0, 50);
const progress = fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, "utf8")) : { images: {}, imported: [] };
const premium = 2500;
const activeSizes = new Set(["XS", "S", "M", "L", "XL", "XXL"]);
const save = () => fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const unique = values => [...new Set(values.filter(Boolean))];

async function upload(url, publicId) {
  if (progress.images[url]) return progress.images[url];
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await cloudinary.uploader.upload(url, {
        public_id: publicId, resource_type: "image", overwrite: false, timeout: 120000,
      });
      progress.images[url] = result.secure_url;
      save();
      return result.secure_url;
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(attempt * 1500);
    }
  }
}

async function fetchCharts(product) {
  const tags = (product.tags || []).filter(tag => tag.toLowerCase().endsWith("-chartify"));
  if (!tags.length) return [];
  const url = "https://smartsizechart.technogroves.com/api/product_size_charts?shop=ethnicpk.myshopify.com&tags=" + encodeURIComponent(tags.join(",") + ",");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Size chart API " + response.status + " for " + product.handle);
  const data = await response.json();
  const charts = Array.isArray(data) ? data : [data];
  return charts.filter(item => item && item.size_chart).map(({ size_chart: chart }) => ({
    title: chart.title || "Measurements",
    unit: "inches",
    diagramUrl: chart.description_2 || "",
    sizes: (chart.size_chart_data?.[0] || []).slice(1).map(String),
    rows: (chart.size_chart_data || []).slice(1).map(row => ({
      label: String(row[0]), values: row.slice(1).map(String),
    })),
  }));
}

const plainText = html => String(html || "")
  .replace(/<br\s*\/?\s*>/gi, "\n")
  .replace(/<\/(p|div|li)>/gi, "\n")
  .replace(/<[^>]*>/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

async function main() {
  if (!process.env.MONGO_URI || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("MongoDB and Cloudinary credentials are required.");
  }
  await connectDB();
  const category = await Category.findOne({ slug: "western" }).lean();
  if (!category) throw new Error("Western category slug 'western' is missing.");
  let created = 0, updated = 0;
  for (const [index, source] of products.entries()) {
    const slug = "ethnc-" + source.handle;
    const imageUrls = unique((source.images || []).map(image => image.src));
    if (!imageUrls.length) throw new Error("No images for " + slug);
    const charts = await fetchCharts(source);
    const imageTasks = [
      ...imageUrls.map((url, i) => ({ url, id: "western/products/" + source.id + "-" + (i + 1) })),
      ...charts.filter(chart => chart.diagramUrl).map((chart, i) => ({ url: chart.diagramUrl, id: "western/size-guides/" + source.id + "-" + (i + 1) })),
    ];
    // Every image is in Cloudinary before this product is written to MongoDB.
    let nextTask = 0;
    await Promise.all(Array.from({ length: Math.min(5, imageTasks.length) }, async () => {
      while (nextTask < imageTasks.length) {
        const task = imageTasks[nextTask++];
        await upload(task.url, task.id);
      }
    }));
    const images = imageUrls.map(url => progress.images[url]);
    const measurementCharts = charts.map(chart => ({
      title: chart.title, unit: chart.unit, sizes: chart.sizes,
      rows: chart.rows, diagramImage: chart.diagramUrl ? progress.images[chart.diagramUrl] : "",
    }));
    const colors = [{ name: "Default", hex: "#777777", images }];
    const sizes = unique((source.variants || []).map(variant => variant.option1).filter(size => activeSizes.has(size)));
    const prices = source.variants.map(variant => Number(variant.price)).filter(Number.isFinite);
    if (!prices.length) throw new Error("No price for " + slug);
    const comparePrices = source.variants.map(variant => Number(variant.compare_at_price)).filter(value => Number.isFinite(value) && value > 0);
    const price = Math.min(...prices) + premium;
    const comparePrice = comparePrices.length ? Math.min(...comparePrices) + premium : null;
    const sourceVariants = source.variants.map(variant => ({
      id: variant.id, sku: variant.sku, size: variant.option1, color: variant.option2,
      available: Boolean(variant.available), price: Number(variant.price) + premium,
      comparePrice: variant.compare_at_price ? Number(variant.compare_at_price) + premium : null,
    }));
    const fields = {
      sourceProductId: source.id, sourceUrl: "https://pk.ethnc.com/products/" + source.handle,
      title: source.title, slug, description: plainText(source.body_html),
      images, measurementImage: measurementCharts[0]?.diagramImage || "",
      measurementCharts, price, comparePrice, category: [category.slug],
      sizes, colors, sourceVariants, isStitched: false, isUnstitched: false,
      stock: source.variants.some(variant => variant.available), status: "active",
    };
    const result = await Product.updateOne({ slug }, {
      $set: fields, $setOnInsert: { productId: source.id },
    }, { upsert: true, runValidators: true });
    if (result.upsertedCount) created++; else updated++;
    progress.imported = unique([...progress.imported, source.id]);
    save();
    console.log((index + 1) + "/50 " + slug + " images=" + images.length + " charts=" + charts.length);
  }
  const count = await Product.countDocuments({ slug: { $in: products.map(p => "ethnc-" + p.handle) }, category: "western" });
  console.log(JSON.stringify({ created, updated, verified: count, uploadedImages: Object.keys(progress.images).length }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
