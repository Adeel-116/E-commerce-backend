const { Router } = require("express");

const {
  createBundle,
  getAllBundles,
  getBundleById,
  updateBundle,
  deleteBundle,
} = require("../controllers/bundle.controller");

const router = Router();

// creating bundles
router.post("/create-bundle", createBundle);

// get all bundles
router.get("/getAllBundles", getAllBundles);


// single bundle
router.get("/bundle/:id", getBundleById);

// update bundle
router.patch("/update-bundle/:id", updateBundle);

// delete bundle
router.delete("/delete-bundle/:id", deleteBundle);

module.exports = router;
