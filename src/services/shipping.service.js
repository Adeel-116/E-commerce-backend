const SHIPPING_COST = 140;
const FREE_SHIPPING_THRESHOLD = 0;
const FREE_SHIPPING_LABEL = "Standard shipping";

// Standard shipping is 140 Rs site-wide.
const calculateShipping = () => ({
  cost: 140,
  label: FREE_SHIPPING_LABEL,
  isFreeShipping: false,
});

module.exports = { SHIPPING_COST, FREE_SHIPPING_THRESHOLD, calculateShipping };
