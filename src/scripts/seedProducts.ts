import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db";
import Product from "../models/ProductModel";

// Temporary sample catalogue so the storefront has something to show while
// real product photography/admin data entry is still in progress. Images
// point at the storefront's own /public/products files (already present),
// so no external image hosting is needed for this placeholder data.
const SAMPLE_PRODUCTS = [
  {
    productId: 1,
    title: "Embroidered Maxi Dress",
    slug: "embroidered-maxi-dress",
    description:
      "A flowing maxi dress finished with delicate embroidery along the yoke. Soft, breathable fabric drapes beautifully for effortless all-day wear.",
    images: ["/products/p1-main.jpg", "/products/p1-hover.jpg"],
    price: 2699,
    comparePrice: 5100,
    category: ["maxi"],
    sizes: ["S", "M", "L", "XL"],
    isNew: false,
    isBestSeller: true,
    stock: true,
  },
  {
    productId: 2,
    title: "Printed Flower 2-Piece Maxi",
    slug: "printed-flower-2-piece-maxi",
    description:
      "A relaxed two-piece maxi set in an all-over floral print, cut from a lightweight fabric that moves with you. Pairs a flowy top with a matching skirt.",
    images: ["/products/p2-main.png", "/products/p2-hover.png"],
    price: 2599,
    comparePrice: 5199,
    category: ["maxi"],
    sizes: ["S", "M", "L", "XL"],
    isNew: false,
    stock: true,
  },
  {
    productId: 3,
    title: "Effortless Elegance with a Desi Touch",
    slug: "effortless-elegance-desi-touch",
    description:
      "A versatile kurta styled with traditional detailing and a modern silhouette. Easy to dress up or down for everyday wear.",
    images: ["/products/p3-main.jpg", "/products/p3-hover.jpg"],
    price: 2999,
    comparePrice: 6000,
    category: ["fashion"],
    sizes: ["XS", "S", "M", "L", "XL"],
    isNew: false,
    isBestSeller: true,
    stock: true,
  },
  {
    productId: 4,
    title: "Elegant Florals with Refined Embellishments",
    slug: "elegant-florals-refined-embellishments",
    description:
      "A refined two-piece suit featuring delicate floral embellishments and a tailored fit. Perfect for both everyday wear and special occasions.",
    images: ["/products/p4-main.png", "/products/p4-hover.png"],
    price: 2699,
    comparePrice: 5399,
    category: ["fashion"],
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    isBestSeller: true,
    stock: true,
  },
  {
    productId: 5,
    title: "Classical Party Wear Romper Maxi",
    slug: "classical-party-wear-romper-maxi",
    description:
      "A structured romper maxi with a fitted bodice and a tiered flowing skirt, designed to make a statement at any evening event.",
    images: ["/products/p5-main.png", "/products/p5-hover.png"],
    price: 2599,
    comparePrice: 5199,
    category: ["maxi"],
    sizes: ["S", "M", "L"],
    isNew: false,
    stock: false,
  },
  {
    productId: 6,
    title: "3 Piece Ladies Long Maxi",
    slug: "3-piece-ladies-long-maxi",
    description:
      "A coordinated three-piece maxi set including an outer layer, inner top, and bottoms — layered for a polished, put-together look.",
    images: ["/products/p6-main.png", "/products/p6-hover.png"],
    price: 2599,
    comparePrice: 5199,
    category: ["maxi"],
    sizes: ["S", "M", "L", "XL"],
    isNew: false,
    stock: true,
  },
  {
    productId: 7,
    title: "Pastel Bloom Co-Ord Set",
    slug: "pastel-bloom-co-ord-set",
    description:
      "A soft pastel co-ord set pairing a floral-printed top with matching wide-leg bottoms. Lightweight fabric ideal for warm-weather styling.",
    images: ["/products/p7-main.jpg", "/products/p7-hover.jpg"],
    price: 2699,
    comparePrice: 5399,
    category: ["top-jeans"],
    sizes: ["XS", "S", "M", "L"],
    isNew: true,
    isBestSeller: true,
    stock: true,
  },
  {
    productId: 8,
    title: "Trendy Matching Jacket Set",
    slug: "trendy-matching-jacket-set",
    description:
      "A western-style two-piece suit with a relaxed, comfortable cut. Finished in a high-quality washable fabric that's ideal for everyday wear.",
    images: [
      "/products/p8-main.jpg",
      "/products/p8-hover.jpg",
      "/products/p8-gallery-3.jpg",
      "/products/p8-gallery-4.jpg",
      "/products/p8-gallery-5.jpg",
      "/products/p8-gallery-6.jpg",
    ],
    price: 2499,
    comparePrice: 5000,
    category: ["western"],
    sizes: ["S", "M", "L", "XL"],
    isNew: false,
    stock: false,
  },
];

const seedProducts = async () => {
  await connectDB();

  for (const product of SAMPLE_PRODUCTS) {
    await Product.findOneAndUpdate(
      { slug: product.slug },
      { $set: { ...product, status: "active" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Seeded: ${product.title}`);
  }

  console.log(`Done — ${SAMPLE_PRODUCTS.length} sample products seeded.`);
  process.exit(0);
};

seedProducts().catch((err) => {
  console.error(err);
  process.exit(1);
});
