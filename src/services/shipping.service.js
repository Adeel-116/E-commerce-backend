const SHIPPING_COST = 200;
const FREE_SHIPPING_THRESHOLD = 5000;
const STANDARD_SHIPPING_LABEL = "Standard shipping";
const FREE_SHIPPING_LABEL = "Free shipping";

const calculateShipping = (rawSubtotal) => {
  const isFreeShipping = rawSubtotal >= FREE_SHIPPING_THRESHOLD;
  return {
    cost: isFreeShipping ? 0 : SHIPPING_COST,
    label: isFreeShipping ? FREE_SHIPPING_LABEL : STANDARD_SHIPPING_LABEL,
    isFreeShipping,
  };
};

module.exports = { SHIPPING_COST, FREE_SHIPPING_THRESHOLD, calculateShipping };
