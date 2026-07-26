const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("../config/db");
const Product = require("../models/ProductModel");

// Live catalogue export (Cloudinary-hosted images + local /public/products
// fallbacks) to sync into the products collection. Upserts by slug so it's
// safe to re-run.
const PRODUCTS = [
  {
    slug: "embroidered-maxi-dress",
    productId: 1,
    title: "Embroidered Maxi Dress",
    description:
      "A flowing maxi dress finished with delicate embroidery along the yoke. Soft, breathable fabric drapes beautifully for effortless all-day wear.",
    images: [
      "https://res.cloudinary.com/kop736vp/image/upload/v1785038465/products/la4sogdkdmrrg60enlay.png",
    ],
    price: 2699,
    comparePrice: 5100,
    category: ["maxi"],
    sizes: ["S", "M", "L", "XL", "XS"],
    colors: [
      {
        name: "Red",
        hex: "#ff0000",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785038465/products/la4sogdkdmrrg60enlay.png",
        ],
      },
      {
        name: "Pink",
        hex: "#00fffb",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785038578/products/cberse9zlq6fhatzgkje.png",
        ],
      },
    ],
    isNew: false,
    isBestSeller: true,
    stock: true,
  },
  {
    slug: "effortless-elegance-with-a-desi-touch",
    productId: 3,
    title: "Effortless Elegance with a Desi Touch",
    description:
      "A versatile kurta styled with traditional detailing and a modern silhouette. Easy to dress up or down for everyday wear.",
    images: ["/products/p3-main.jpg", "/products/p3-hover.jpg"],
    price: 2999,
    comparePrice: 6000,
    category: ["fashion"],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      {
        name: "Default",
        hex: "#cccccc",
        images: ["/products/p3-main.jpg", "/products/p3-hover.jpg"],
      },
    ],
    isNew: false,
    isBestSeller: true,
    stock: true,
  },
  {
    slug: "elegant-florals-refined-embellishments",
    productId: 4,
    title: "Elegant Florals with Refined Embellishments",
    description:
      "A refined two-piece suit featuring delicate floral embellishments and a tailored fit. Perfect for both everyday wear and special occasions.",
    images: ["/products/p4-main.png", "/products/p4-hover.png"],
    price: 2699,
    comparePrice: 5399,
    category: ["fashion"],
    sizes: ["S", "M", "L", "XL"],
    colors: [],
    isNew: true,
    isBestSeller: true,
    stock: true,
  },
  {
    slug: "classical-party-wear-romper-maxi",
    productId: 5,
    title: "Classical Party Wear Romper Maxi",
    description:
      "A structured romper maxi with a fitted bodice and a tiered flowing skirt, designed to make a statement at any evening event.",
    images: ["/products/p5-main.png", "/products/p5-hover.png"],
    price: 2599,
    comparePrice: 5199,
    category: ["maxi"],
    sizes: ["S", "M", "L"],
    colors: [],
    isNew: false,
    isBestSeller: false,
    stock: false,
  },
  {
    slug: "3-piece-ladies-long-maxi",
    productId: 6,
    title: "3 Piece Ladies Long Maxi",
    description:
      "A coordinated three-piece maxi set including an outer layer, inner top, and bottoms — layered for a polished, put-together look.",
    images: ["/products/p6-main.png", "/products/p6-hover.png"],
    price: 2599,
    comparePrice: 5199,
    category: ["maxi"],
    sizes: ["S", "M", "L", "XL"],
    colors: [],
    isNew: false,
    isBestSeller: false,
    stock: true,
  },
  {
    slug: "pastel-bloom-co-ord-set",
    productId: 7,
    title: "Pastel Bloom Co-Ord Set",
    description:
      "A soft pastel co-ord set pairing a floral-printed top with matching wide-leg bottoms. Lightweight fabric ideal for warm-weather styling.",
    images: ["/products/p7-main.jpg", "/products/p7-hover.jpg"],
    price: 2699,
    comparePrice: 5399,
    category: ["top-jeans"],
    sizes: ["XS", "S", "M", "L"],
    colors: [],
    isNew: true,
    isBestSeller: true,
    stock: true,
  },
  {
    slug: "trendy-matching-jacket-set",
    productId: 8,
    title: "Trendy Matching Jacket Set",
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
    colors: [],
    isNew: false,
    isBestSeller: false,
    stock: false,
  },
  {
    slug: "test",
    productId: 9,
    title: "Test",
    description: "Test",
    images: [
      "https://res.cloudinary.com/kop736vp/image/upload/v1785038711/products/jekd6y7bmvbojdqxoj6x.png",
      "https://res.cloudinary.com/kop736vp/image/upload/v1785038720/products/hsuinoifa165xkqpwmxf.png",
      "https://res.cloudinary.com/kop736vp/image/upload/v1785038730/products/i1hgyezqtfrshaaymyon.png",
      "https://res.cloudinary.com/kop736vp/image/upload/v1785038739/products/bdllot0imprb5q7xlvfp.png",
      "https://res.cloudinary.com/kop736vp/image/upload/v1785038748/products/rs6l1f766kl9q61j0rhf.png",
      "https://res.cloudinary.com/kop736vp/image/upload/v1785038757/products/o0mu4fnns9mfzpxqwj38.png",
    ],
    price: 2342,
    comparePrice: null,
    category: ["fashion"],
    sizes: ["S", "XS", "XL", "XXL", "M", "L"],
    colors: [
      {
        name: "Default",
        hex: "#ff0000",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785038711/products/jekd6y7bmvbojdqxoj6x.png",
          "https://res.cloudinary.com/kop736vp/image/upload/v1785038720/products/hsuinoifa165xkqpwmxf.png",
          "https://res.cloudinary.com/kop736vp/image/upload/v1785038730/products/i1hgyezqtfrshaaymyon.png",
          "https://res.cloudinary.com/kop736vp/image/upload/v1785038739/products/bdllot0imprb5q7xlvfp.png",
          "https://res.cloudinary.com/kop736vp/image/upload/v1785038748/products/rs6l1f766kl9q61j0rhf.png",
          "https://res.cloudinary.com/kop736vp/image/upload/v1785038757/products/o0mu4fnns9mfzpxqwj38.png",
        ],
      },
    ],
    isNew: false,
    isBestSeller: false,
    stock: true,
  },
  {
    slug: "printed-flower-2-piece-maxi-d-2004",
    productId: 10,
    title: "💖Printed Flower 2-Piece Maxi 🌟 -D:2004✨",
    description:
      "💖 Fabric Details:\n• Premium Italian Boski / breathable blended fabric\n• Soft, skin-friendly & comfortable wear\n• Suitable for summer & winter both\n• Easy to carry, easy to maintain\n\n🌟 Why You'll Love It:\n• Beautiful & trendy prints\n• Comfortable for daily wear & casual outings\n• Keeps you cool in summer & cozy in winter\n• Long-lasting colors & fine stitching\n\n📏 Available Sizes (Chest in Inches):\n• Small – 19\" (Length 35)\n• Medium – 21\" (Length 36)\n• Large – 23\" (Length 38)\n• XL – 24\" (Length 40)\n📐 Measurements:\nMaxi Lenght: 35 To 43\n✨ Customize size available – get the perfect fit made just for you!",
    images: [
      "https://res.cloudinary.com/kop736vp/image/upload/v1785066935/products/y57kdz5whgyc8kjej2ax.jpg",
    ],
    price: 2599,
    comparePrice: 4999,
    category: ["maxi"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      {
        name: "mehron",
        hex: "#bd0000",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785066935/products/y57kdz5whgyc8kjej2ax.jpg",
        ],
      },
      {
        name: "black",
        hex: "#1c1c1c",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785066976/products/ntzmvw0hqawl3bxk5pwu.jpg",
        ],
      },
      {
        name: "pinl",
        hex: "#ff00bb",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785067039/products/vxm2qmrzswtpreqbdzmr.jpg",
        ],
      },
      {
        name: "blue",
        hex: "#7c8cb0",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785067193/products/at4egmdfqi5mxnzwckpf.jpg",
        ],
      },
    ],
    isNew: true,
    isBestSeller: true,
    stock: true,
  },
  {
    slug: "fairy-tail-button-co-ord-set-ko-17",
    productId: 11,
    title: "Fairy-Tail Button Co-Ord Set | KO-17",
    description:
      "Fairy-Tail Button Co-Ord Set\nStep into elegance with the Fairy-Tail Button Co-Ord Set, designed for women who love effortless chic style. Tailored from premium imported lite georgette, this co-Ord set combines breathability, comfort, and a fashionable edge — perfect for summer wear.\n\n✨ Shirt Features:\n\nButton-down design with a stylish look\nFlowy high-low hem (Front Length: 31\", Back Length: 35\")\nAvailable in Medium (Chest 19\") & Large (Chest 21\")\n✨ Trouser Features:\n\nMatching straight-fit trousers\nLength: 39 inches\nRelaxed fit for all-day comfort\nWhether for casual outings, office wear, or semi-formal gatherings, this co-ord set is your go-to outfit for modern elegance.",
    images: [
      "https://res.cloudinary.com/kop736vp/image/upload/v1785068946/products/kzknpqmwmotpkle3z9h7.jpg",
    ],
    price: 2499,
    comparePrice: 3799,
    category: ["western", "fashion"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      {
        name: "mehron",
        hex: "#8f0000",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785068946/products/kzknpqmwmotpkle3z9h7.jpg",
        ],
      },
      {
        name: "Red",
        hex: "#ff0000",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785069082/products/u0krbkbxzqkv2hx853pj.jpg",
        ],
      },
      {
        name: "Dark Green",
        hex: "#003d01",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785069290/products/anwi1f8wduy1dzwlmpn5.jpg",
        ],
      },
      {
        name: "Navy Blue",
        hex: "#05002e",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785069319/products/x46xetmxt0d7ziavtcw1.jpg",
        ],
      },
      {
        name: "Lailic",
        hex: "#ffb3ee",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785069386/products/gluh68efufvl8wvjgls1.jpg",
        ],
      },
      {
        name: "Black",
        hex: "#0d0d0d",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785069476/products/auam5vtwtpywp1oiufl3.jpg",
        ],
      },
    ],
    isNew: true,
    isBestSeller: true,
    stock: true,
  },
  {
    slug: "heart-embroidered-2-piece-set",
    productId: 12,
    title: "Heart Embroidered 2-Piece Set",
    description:
      "Heart Embroidered  2-Piece Set\nFabric: (Pure Cotton)\nPure Cotton Comfort: Lightweight feel with long-lasting wear\n2-Piece Set: Shirt paired with an embroidered trouser\nTrouser: Included\nStitching: Fully stitched and ready to wear\nSize Guide\nS / M / L / XL\n\nChest: 19\" – 22\"\nShirt Length: 34\" – 35\"\nTrouser Length: 37\" – 40\"\nWaist: Elastic (40\" – 46\")\nDescription\nThis beautifully designed 2-piece set offers a perfect balance of contemporary style and classic elegance. Featuring fine detailing, vibrant patterns, and a comfortable fit, it is ideal for casual wear, gatherings, and everyday styling—ensuring an effortlessly refined look on any occasion.",
    images: [
      "https://res.cloudinary.com/kop736vp/image/upload/v1785071255/products/s0gawgu04wzmhpxv6eai.jpg",
    ],
    price: 2299,
    comparePrice: 2999,
    category: ["western", "fashion"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      {
        name: "Mehron",
        hex: "#940000",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785071255/products/s0gawgu04wzmhpxv6eai.jpg",
        ],
      },
      {
        name: "black",
        hex: "#000000",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785071268/products/xayp2eoiyg6ao0kkkztt.jpg",
        ],
      },
      {
        name: "baby pink",
        hex: "#d08ba2",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785071624/products/dqbgkwmcemtnnmdzbg23.jpg",
        ],
      },
      {
        name: "lailic",
        hex: "#ac89d7",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785071669/products/qrppa3wyj3veoa8gf3bc.jpg",
        ],
      },
      {
        name: "Brown",
        hex: "#9e3f00",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785072013/products/qdf7rjfmdjfl2bymgjtu.jpg",
        ],
      },
    ],
    isNew: true,
    isBestSeller: true,
    stock: true,
  },
  {
    slug: "lavender-grace-cotton-farshi-shalwar-3pc",
    productId: 13,
    title: "Lavender Grace – Cotton Farshi Shalwar 3PC 💜",
    description:
      "Product Description:\nStep into effortless elegance with Lavender Grace, a beautifully crafted 3-piece cotton outfit by zainabclothes designed for comfort and timeless style. Featuring delicate dori latkan detailing on the neckline, piping and lace work on the sleeves and borders, this ensemble is paired with a stunning purple Farshi Shalwar and a lightweight chiffon dupatta for a graceful festive look.\n\nMade from premium cotton with fine stitching, it's perfect for Eid, festive gatherings, family events, and elegant everyday wear.\n\nProduct Details:\n• Dori Latkan Neck Design\n• Sleeves Border Piping with Lace Work\n• Farshi Shalwar\n• Lightweight Chiffon Dupatta\n• Premium Quality Stitching\n• 3 Piece Ready-to-Wear Outfit\n\nFabric Details:\n• Shirt: Premium Cotton\n• Farshi Shalwar: Premium Cotton\n• Dupatta: Lightweight Chiffon (2.5 Yards)\n\nAvailable Sizes:\n• Small\n• Medium\n• Large\n\nPerfect for festive wear, Eid, family gatherings, office & elegant daily styling. ✨",
    images: [
      "https://res.cloudinary.com/kop736vp/image/upload/v1785074677/products/ljtxjlepz5l6aywglbiq.jpg",
      "https://res.cloudinary.com/kop736vp/image/upload/v1785074677/products/xdk01wbgevxbet20libe.jpg",
      "https://res.cloudinary.com/kop736vp/image/upload/v1785074677/products/gwpcosiimdenrhz98qpg.jpg",
      "https://res.cloudinary.com/kop736vp/image/upload/v1785074677/products/ziy6mpswf7ja2hquownj.jpg",
    ],
    price: 2999,
    comparePrice: 4500,
    category: ["fashion", "western"],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      {
        name: "Lavender",
        hex: "#a8c689",
        images: [
          "https://res.cloudinary.com/kop736vp/image/upload/v1785074677/products/ljtxjlepz5l6aywglbiq.jpg",
          "https://res.cloudinary.com/kop736vp/image/upload/v1785074677/products/xdk01wbgevxbet20libe.jpg",
          "https://res.cloudinary.com/kop736vp/image/upload/v1785074677/products/gwpcosiimdenrhz98qpg.jpg",
          "https://res.cloudinary.com/kop736vp/image/upload/v1785074677/products/ziy6mpswf7ja2hquownj.jpg",
        ],
      },
    ],
    isNew: true,
    isBestSeller: true,
    stock: true,
  },
];

const seedCatalog = async () => {
  await connectDB();

  for (const product of PRODUCTS) {
    await Product.findOneAndUpdate(
      { slug: product.slug },
      { $set: { ...product, status: "active" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Seeded: ${product.title}`);
  }

  console.log(`Done — ${PRODUCTS.length} products seeded.`);
  process.exit(0);
};

seedCatalog().catch((err) => {
  console.error(err);
  process.exit(1);
});
