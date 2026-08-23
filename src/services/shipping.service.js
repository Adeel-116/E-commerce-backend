const SHIPPING_COST = 0;
const FREE_SHIPPING_THRESHOLD = 0;
const FREE_SHIPPING_LABEL = "Free shipping";

// Shipping is free site-wide, no minimum spend.
const calculateShipping = () => ({
  cost: 0,
  label: FREE_SHIPPING_LABEL,
  isFreeShipping: true,
});

module.exports = { SHIPPING_COST, FREE_SHIPPING_THRESHOLD, calculateShipping };
