const { AppError } = require("../utils/AppError");
const ProductService = require("../services/product.service");
const { uploadImageBuffer } = require("../config/cloudinary");

// ── Public ────────────────────────────────────────────────────────────────────

const filterProducts = async (req, res) => {
  const result = await ProductService.filterProducts(req.query);
  res.status(200).json({ success: true, ...result });
};

const getTitleSuggestions = async (req, res) => {
  const search = (req.query.search ?? "").trim();
  const limit = Number(req.query.limit) || 4;
  const data = await ProductService.getTitleSuggestions(search, limit);
  res.status(200).json({ success: true, total: data.length, data });
};

const getProductById = async (req, res) => {
  const data = await ProductService.getProductById(
    req.query.id,
    req.query.slug
  );
  res.status(200).json({ success: true, message: "Product fetched successfully", data });
};

const getActiveCategories = async (req, res) => {
  const data = await ProductService.getActiveCategories();
  res.status(200).json({ success: true, data });
};

// ── Admin CRUD ────────────────────────────────────────────────────────────────

const createProduct = async (req, res) => {
  const product = await ProductService.createProduct(req.body);
  res.status(201).json({ success: true, message: "Product created successfully", data: product });
};

const editProduct = async (req, res) => {
  const idParam = req.query.id;
  if (!idParam) {
    return res.status(400).json({ success: false, message: "Product id is required" });
  }
  const updated = await ProductService.updateProduct(idParam, req.body);
  res.status(200).json({ success: true, message: "Product updated successfully", data: updated });
};

const deleteProduct = async (req, res) => {
  const result = await ProductService.deleteProduct(req.query);

  if (result.mode === "all" || result.mode === "multiple") {
    res.status(200).json({
      success: true,
      message:
        result.mode === "all"
          ? "All products deleted successfully"
          : "Products deleted successfully",
      deletedCount: result.deletedCount,
    });
  } else {
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  }
};

// ── Bulk CSV ──────────────────────────────────────────────────────────────────

const bulkCSVUpload = async (req, res) => {
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }
  const stats = await ProductService.bulkImportFromCSV(req.file.path);
  res.json({ success: true, message: "CSV imported successfully", stats });
};

// ── Image upload ──────────────────────────────────────────────────────────────

const uploadProductImage = async (req, res) => {
  if (!req.file) {
    throw new AppError("No image uploaded", 400);
  }
  const url = await uploadImageBuffer(req.file.buffer);
  res.status(200).json({ success: true, url });
};

module.exports = {
  filterProducts,
  getTitleSuggestions,
  getProductById,
  getActiveCategories,
  createProduct,
  editProduct,
  deleteProduct,
  bulkCSVUpload,
  uploadProductImage,
};
