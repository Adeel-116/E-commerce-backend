const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const cloudinary = require("../config/cloudinary");
const connectDB = require("../config/db");
const Product = require("../models/ProductModel");
const Category = require("../models/CategoryModel");

const sourceDir = process.argv.slice(2).find(arg => !arg.startsWith("--")) || path.join(process.env.USERPROFILE || "", "Documents", "pairs");
const products = [
  { file: "1-A.png", slug: "kids-adventure-trail-terry-set", title: "Adventure Trail Kids 2 Piece Set - Terry Fabric" },
  { file: "ChatGPT Image Sep 19, 2026, 01_10_02 AM.png", slug: "kids-dino-graphic-terry-set", title: "Dino Graphic Kids 2 Piece Set - Terry Fabric" },
  { file: "ChatGPT Image Sep 19, 2026, 01_14_58 AM.png", slug: "kids-superhero-graphic-terry-set", title: "Superhero Graphic Kids 2 Piece Set - Terry Fabric" },
  { file: "ChatGPT Image Sep 19, 2026, 12_42_20 AM.png", slug: "kids-skater-graphic-terry-set", title: "Skater Graphic Kids 2 Piece Set - Terry Fabric" },
  { file: "ChatGPT Image Sep 19, 2026, 12_43_16 AM.png", slug: "kids-king-graphic-terry-set", title: "King Graphic Kids 2 Piece Set - Terry Fabric" },
  { file: "ChatGPT Image Sep 19, 2026, 12_44_01 AM.png", slug: "kids-space-graphic-terry-set", title: "Space Graphic Kids 2 Piece Set - Terry Fabric" },
  { file: "ChatGPT Image Sep 19, 2026, 12_44_13 AM.png", slug: "kids-rider-graphic-terry-set", title: "Rider Graphic Kids 2 Piece Set - Terry Fabric" },
];
const sizeGuide = path.join(sourceDir, "size-guide.png");
const uploaded = {};
const upload = async (file, publicId) => {
  const result = await cloudinary.uploader.upload(file, {
    public_id: publicId, resource_type: "image", overwrite: true, invalidate: true,
  });
  if (!result.secure_url) throw new Error("Cloudinary returned no URL for " + file);
  return result.secure_url;
};

async function main() {
  if (!process.env.MONGO_URI || !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("MongoDB and Cloudinary credentials are required in backend/.env");
  }
  for (const file of [sizeGuide, ...products.map(product => path.join(sourceDir, product.file))]) {
    if (!fs.existsSync(file)) throw new Error("Missing image: " + file);
  }
  // Finish all Cloudinary uploads before creating or changing any database record.
  const reuse = process.argv.includes("--reuse-uploaded");
  const asset = async (file, publicId) => reuse
    ? (await cloudinary.api.resource(publicId)).secure_url
    : upload(file, publicId);
  uploaded.guide = await asset(sizeGuide, "kids/size-guide");
  for (const product of products) {
    uploaded[product.slug] = await asset(path.join(sourceDir, product.file), "kids/products/" + product.slug);
    console.log((reuse ? "Verified " : "Uploaded ") + product.slug);
  }
  await connectDB();
  let category = await Category.findOne({ slug: "kids-collection" });
  if (!category) category = await Category.create({
    name: "Kids Collection", slug: "kids-collection",
    image: { url: uploaded[products[0].slug], publicId: "kids/products/" + products[0].slug },
    status: "active", order: 10,
  });
  for (const [index, product] of products.entries()) {
    const fields = {
      title: product.title, slug: product.slug,
      description: "Fully stitched kids 2 piece set in Terry fabric. Includes a long sleeve graphic top and matching trousers. Available sizes: 2–3 years, 4–5 years, and 5–6 years. Please check the size guide before ordering.",
      images: [uploaded[product.slug]], measurementImage: uploaded.guide,
      price: 1000, sizePrices: { "2-3 Years": 1000, "4-5 Years": 1000, "5-6 Years": 1100 },
      category: ["kids-collection"], sizes: ["2-3 Years", "4-5 Years", "5-6 Years"], colors: [],
      isStitched: true, isUnstitched: false, stitchedPrice: null,
      stock: true, status: "active",
    };
    await Product.updateOne({ slug: product.slug }, {
      $set: fields, $setOnInsert: { productId: 96000101 + index },
    }, { upsert: true, runValidators: true });
    console.log("Saved " + product.slug);
  }
  const duplicate = await Category.findOne({ slug: "kids", "image.publicId": "kids/products/kids-adventure-trail-terry-set" });
  if (duplicate && !(await Product.exists({ category: "kids" }))) await duplicate.deleteOne();
  const count = await Product.countDocuments({ slug: { $in: products.map(product => product.slug) } });
  if (count !== products.length) throw new Error("Expected " + products.length + " products; found " + count);
  const saved = await Product.find({ slug: { $in: products.map(product => product.slug) } }).lean();
  for (const product of saved) {
    if (JSON.stringify(product.sizes) !== JSON.stringify(["2-3 Years", "4-5 Years", "5-6 Years"]) ||
        product.sizePrices?.["2-3 Years"] !== 1000 || product.sizePrices?.["4-5 Years"] !== 1000 ||
        product.sizePrices?.["5-6 Years"] !== 1100 || product.measurementImage !== uploaded.guide ||
        product.colors?.length) throw new Error("Kids product verification failed: " + product.slug);
  }
  console.log("Verified " + count + " kids products, shared size guide, and category " + category.slug);
}
main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());





