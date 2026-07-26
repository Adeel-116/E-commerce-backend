const mongoose = require("mongoose");
const Bundle = require("../models/BundleModel");
const Product = require("../models/ProductModel");

const computeSavedAmount = async (
  productId,
  numberOfItems,
  prices
) => {
  if (!productId || !numberOfItems || !prices?.length) return 0;

  const product = await Product.findById(productId).select("price").lean();
  const basePrice = product?.price ?? 0;

  const bundlePrice = prices.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const savedAmount = basePrice * numberOfItems - bundlePrice;
  return savedAmount > 0 ? parseFloat(savedAmount.toFixed(2)) : 0;
};

const createBundleService = async (payload) => {
  const savedAmount = await computeSavedAmount(payload.productId, payload.numberOfItems, payload.prices);
  return Bundle.create({ ...payload, savedAmount });
};

const getAllBundlesService = async () => {
  return Bundle.find().sort({ createdAt: -1 }).populate("productId", "title images price");
};

const getBundleByIdService = async (id) => {
  return Bundle.findById(id).populate("productId", "title images price");
};

const updateBundleService = async (
  id,
  payload
) => {
  const existing = await Bundle.findById(id);
  if (!existing) return null;

  const productId = payload.productId ?? existing.productId?.toString();
  const numberOfItems = payload.numberOfItems ?? existing.numberOfItems;
  const prices = payload.prices ?? existing.prices;
  const savedAmount = await computeSavedAmount(productId, numberOfItems, prices);

  return Bundle.findByIdAndUpdate(id, { ...payload, savedAmount }, { new: true, runValidators: false });
};

const deleteBundleService = async (id) => {
  return Bundle.findByIdAndDelete(id);
};

const toBundleOption = (bundle) => {
  const count = bundle.numberOfItems;
  if (!count || !bundle.prices?.length || !bundle.savedAmount) return null;

  const bundlePrice = bundle.prices.reduce((sum, p) => sum + (p.price ?? 0), 0);
  if (bundlePrice <= 0) return null;

  return { numberOfItems: count, bundlePrice, savings: bundle.savedAmount };
};

const pickBestBundleCombo = (options, totalQty) => {
  const bestSavings = new Array(totalQty + 1).fill(0);
  const chosenAt = new Array(totalQty + 1).fill(null);

  for (let qty = 1; qty <= totalQty; qty++) {
    bestSavings[qty] = bestSavings[qty - 1]; // leave this unit unbundled
    for (const option of options) {
      if (option.numberOfItems > qty) continue;
      const savingsIfUsed = bestSavings[qty - option.numberOfItems] + option.savings;
      if (savingsIfUsed > bestSavings[qty]) {
        bestSavings[qty] = savingsIfUsed;
        chosenAt[qty] = option;
      }
    }
  }

  const combo = [];
  let qty = totalQty;
  while (qty > 0) {
    const chosen = chosenAt[qty];
    if (!chosen) {
      qty -= 1;
      continue;
    }
    combo.push(chosen.numberOfItems);
    qty -= chosen.numberOfItems;
  }
  return combo;
};

const applyBundlePricing = async (cartItems) => {
  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  if (productIds.length === 0) {
    return { items: cartItems, appliedBundles: [], totalBundleSavings: 0 };
  }

  const allBundles = await Bundle.find({
    productId: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();

  const result = cartItems.map((item) => ({ ...item }));
  const appliedBundles = [];

  for (const productId of productIds) {
    const items = result.filter((i) => i.productId === productId);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQty === 0) continue;

    const options = allBundles
      .filter((b) => b.productId?.toString() === productId)
      .map(toBundleOption)
      .filter((o) => o !== null);
    if (options.length === 0) continue;

    const combo = pickBestBundleCombo(options, totalQty);
    if (combo.length === 0) continue;

    let itemIndex = 0;
    let usedInItem = 0;
    const costByItem = new Map(items.map((item) => [item, 0]));

    const consumeUnits = (count, unitCost) => {
      const units = [];
      let remaining = count;
      while (remaining > 0 && itemIndex < items.length) {
        const item = items[itemIndex];
        const take = Math.min(item.quantity - usedInItem, remaining);
        units.push({ item, qty: take });
        usedInItem += take;
        remaining -= take;
        if (usedInItem >= item.quantity) {
          itemIndex += 1;
          usedInItem = 0;
        }
      }
      unitCost(units);
    };

    const timesUsedByCombo = new Map();
    for (const bundleSize of combo) {
      timesUsedByCombo.set(bundleSize, (timesUsedByCombo.get(bundleSize) ?? 0) + 1);

      const option = options.find((o) => o.numberOfItems === bundleSize);
      consumeUnits(bundleSize, (units) => {
        const originalCost = units.reduce((sum, u) => sum + u.qty * u.item.price, 0);
        const ratio = originalCost > 0 ? Math.min(option.bundlePrice, originalCost) / originalCost : 1;
        for (const u of units) costByItem.set(u.item, costByItem.get(u.item) + u.qty * u.item.price * ratio);
      });
    }
    consumeUnits(totalQty, (units) => {
      for (const u of units) costByItem.set(u.item, costByItem.get(u.item) + u.qty * u.item.price);
    });

    for (const item of items) item.price = costByItem.get(item) / item.quantity;

    for (const [numberOfItems, timesApplied] of timesUsedByCombo) {
      const option = options.find((o) => o.numberOfItems === numberOfItems);
      appliedBundles.push({
        productId,
        numberOfItems,
        bundlePrice: option.bundlePrice,
        timesApplied,
        totalSavings: parseFloat((option.savings * timesApplied).toFixed(2)),
      });
    }
  }

  const totalBundleSavings = parseFloat(
    appliedBundles.reduce((sum, b) => sum + b.totalSavings, 0).toFixed(2)
  );

  return { items: result, appliedBundles, totalBundleSavings };
};

module.exports = {
  createBundleService,
  getAllBundlesService,
  getBundleByIdService,
  updateBundleService,
  deleteBundleService,
  applyBundlePricing,
};
