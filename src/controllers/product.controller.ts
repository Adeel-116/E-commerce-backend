import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import * as ProductService from "../services/product.service";
import { uploadImageBuffer } from "../config/cloudinary";
import type { ProductFilterQuery, DeleteProductQuery } from "../types";

// ── Public ────────────────────────────────────────────────────────────────────

export const filterProducts = async (req: Request, res: Response) => {
  const result = await ProductService.filterProducts(req.query as ProductFilterQuery);
  res.status(200).json({ success: true, ...result });
};

export const getTitleSuggestions = async (req: Request, res: Response) => {
  const search = ((req.query.search as string) ?? "").trim();
  const limit = Number(req.query.limit) || 4;
  const data = await ProductService.getTitleSuggestions(search, limit);
  res.status(200).json({ success: true, total: data.length, data });
};

export const getProductById = async (req: Request, res: Response) => {
  const data = await ProductService.getProductById(
    req.query.id as string | undefined,
    req.query.slug as string | undefined
  );
  res.status(200).json({ success: true, message: "Product fetched successfully", data });
};

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export const createProduct = async (req: Request, res: Response) => {
  const product = await ProductService.createProduct(req.body);
  res.status(201).json({ success: true, message: "Product created successfully", data: product });
};

export const editProduct = async (req: Request, res: Response) => {
  const idParam = req.query.id as string;
  if (!idParam) {
    return res.status(400).json({ success: false, message: "Product id is required" });
  }
  const updated = await ProductService.updateProduct(idParam, req.body);
  res.status(200).json({ success: true, message: "Product updated successfully", data: updated });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const result = await ProductService.deleteProduct(req.query as DeleteProductQuery);

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

export const bulkCSVUpload = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }
  const stats = await ProductService.bulkImportFromCSV(req.file.path);
  res.json({ success: true, message: "CSV imported successfully", stats });
};

// ── Image upload ──────────────────────────────────────────────────────────────

export const uploadProductImage = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("No image uploaded", 400);
  }
  const url = await uploadImageBuffer(req.file.buffer);
  res.status(200).json({ success: true, url });
};
