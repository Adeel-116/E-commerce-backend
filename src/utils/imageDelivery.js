const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/i;
const CARD_WIDTHS = [240, 360, 480, 640, 800];
const TRANSFORMATION = /^(?:a|ar|b|bo|c|co|dpr|e|f|fl|g|h|l|o|q|r|t|u|w|x|y|z)_/;

function imageUrl(url, width) {
  if (typeof url !== "string") return url;
  const match = url.match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  const [, prefix, path] = match;
  // Signed delivery URLs cannot be rewritten without generating a new signature.
  if (path.startsWith("s--")) return url;
  const parts = path.split("/");
  let index = 0;
  while (index < parts.length - 1 && TRANSFORMATION.test(parts[index])) index++;
  const existing = parts.slice(0, index).join(",");
  const missing = [];
  if (!/(?:^|,)f_auto(?:[:,]|$)/.test(existing)) missing.push("f_auto");
  if (!/(?:^|,)q_auto(?:[:,]|$)/.test(existing)) missing.push("q_auto");
  if (missing.length) { parts.splice(index, 0, missing.join(",")); index++; }
  if (width) parts.splice(index, 0, `c_limit,w_${width}`);
  return prefix + parts.join("/");
}

function productImages(product, { cards = false } = {}) {
  const result = {
    ...product,
    images: (product.images || []).map(url => imageUrl(url)),
    colors: (product.colors || []).map(color => ({ ...color, images: (color.images || []).map(url => imageUrl(url)) })),
  };
  if (product.measurementImage) result.measurementImage = imageUrl(product.measurementImage);
  if (cards) {
    const urls = new Set([
      ...result.images.slice(0, 2),
      ...result.colors.flatMap(color => color.images.slice(0, 2)),
    ]);
    result.cardImageDelivery = Object.fromEntries([...urls].map(url => [url, {
      src: imageUrl(url, 480),
      ...(imageUrl(url, 480) !== url ? { srcSet: CARD_WIDTHS.map(width => `${imageUrl(url, width)} ${width}w`).join(", ") } : {}),
    }]));
  }
  return result;
}

module.exports = { imageUrl, productImages };
