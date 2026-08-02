const { Router } = require("express");
const {
  filterProducts,
  getTitleSuggestions,
  getSimilarProducts,
  getProductById,
  getActiveCategories,
} = require("../controllers/product.controller");

const router = Router();

router.get("/universalFilter", filterProducts);
router.get("/getTitleSuggestion", getTitleSuggestions);
router.get("/getSimilarProducts", getSimilarProducts);
router.get("/getProductById", getProductById);
router.get("/getActiveCategories", getActiveCategories);

module.exports = router;
