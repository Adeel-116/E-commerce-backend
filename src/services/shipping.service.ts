export const SHIPPING_COST = 200;
export const FREE_SHIPPING_THRESHOLD = 3000;
const STANDARD_SHIPPING_LABEL = "Standard shipping";
const FREE_SHIPPING_LABEL = "Free shipping";

export const calculateShipping = (rawSubtotal: number) => {
  const isFreeShipping = rawSubtotal >= FREE_SHIPPING_THRESHOLD;
  return {
    cost: isFreeShipping ? 0 : SHIPPING_COST,
    label: isFreeShipping ? FREE_SHIPPING_LABEL : STANDARD_SHIPPING_LABEL,
    isFreeShipping,
  };
};
