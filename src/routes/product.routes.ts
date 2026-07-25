import { Router } from "express";
import {
  filterProducts,
  getTitleSuggestions,
  getProductById,
} from "../controllers/product.controller";

const router = Router();

router.get("/universalFilter", filterProducts);
router.get("/getTitleSuggestion", getTitleSuggestions);
router.get("/getProductById", getProductById);

export default router;
