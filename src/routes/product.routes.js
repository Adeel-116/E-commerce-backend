const { Router } = require("express");
const {
  filterProducts,
  getTitleSuggestions,
  getProductById,
} = require("../controllers/product.controller");

const router = Router();

router.get("/universalFilter", filterProducts);
router.get("/getTitleSuggestion", getTitleSuggestions);
router.get("/getProductById", getProductById);

module.exports = router;
