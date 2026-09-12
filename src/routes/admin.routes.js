const { Router } = require("express");
const multer = require("multer");
const {
  createProduct,
  editProduct,
  deleteProduct,
  bulkCSVUpload,
  uploadProductImage,
} = require("../controllers/product.controller");
const {
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  updateOrderDetails,
  deleteOrder,
  getOrderEmails,
  exportOrders,
} = require("../controllers/order.controller");

const { getDashboardStats } = require("../controllers/dashboard.controller");
const {
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getAllDiscounts,
} = require("../controllers/discount.controller");
const {
  getAllSubscribers,
  deleteSubscriber,
} = require("../controllers/subscriber.controller");
const {
  getMarketingCost,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} = require("../controllers/marketing.controller");
const { protect, protectAdmin } = require("../middleware/auth");
const { uploadCsv } = require("../middleware/uploadCsv");
const { uploadImage } = require("../middleware/uploadImage");
const {
  listCheckouts,
  updateCheckout,
  deleteCheckouts,
} = require("../controllers/abandonedCheckout.controller");
const {
  listAdminReviews,
  createReview,
  updateReview,
  deleteReview,
} = require("../controllers/review.controller");

const router = Router();
const banners = require("../controllers/banner.controller");
const { uploadBanner } = require("../middleware/uploadBanner");
const upload = multer({ storage: multer.memoryStorage() });
const {
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

router.use(protect, protectAdmin);
router.get("/banners", banners.listBanners);
router.post("/banners", uploadBanner, banners.saveBanner);
router.put("/banners/:id", uploadBanner, banners.saveBanner);
router.delete("/banners/:id", banners.deleteBanner);

// Customer reviews
router.get("/reviews", listAdminReviews);
router.post("/reviews", uploadImage.single("screenshot"), createReview);
router.put("/reviews/:id", uploadImage.single("screenshot"), updateReview);
router.delete("/reviews/:id", deleteReview);

// Orders
router.get("/orders", getAllOrders);
router.patch("/orders/status/:orderId", updateOrderStatus);
router.patch("/orders/payment-status/:orderId", updatePaymentStatus);
router.patch("/edit-order/:orderId", updateOrderDetails);
router.delete("/orders/delete", deleteOrder);
router.get("/get-orders-email", getOrderEmails);

// Abandoned checkouts
router.get("/abandoned-checkouts", listCheckouts);
router.patch("/abandoned-checkouts/:id", updateCheckout);
router.delete("/abandoned-checkouts", deleteCheckouts);


// Category management
router.get("/categories", listAdminCategories);
router.post("/categories", uploadImage.single("image"), createCategory);
router.put("/categories/:id", uploadImage.single("image"), updateCategory);
router.delete("/categories/:id", deleteCategory);
// Product management
router.post("/create-product", upload.none(), createProduct);
router.put("/edit-product", upload.none(), editProduct);
router.delete("/delete-product", deleteProduct);
router.post("/bulk-upload", uploadCsv.single("file"), bulkCSVUpload);
router.post("/upload-image", uploadImage.single("image"), uploadProductImage);

// Dashboard
router.get("/dashboard/stats", getDashboardStats);

// get order CSV
router.post("/orders/export", exportOrders);

// Discounts
router.post("/create/discount", createDiscount);
router.get("/all/discount", getAllDiscounts);
router.delete("/discount/delete", deleteDiscount);
router.put("/discount/update", updateDiscount);

// Subscribers
router.get("/subscribers", getAllSubscribers);
router.delete("/subscribers/delete", deleteSubscriber);

// Marketing
router.get("/marketing", getMarketingCost);
router.post("/marketing", createCampaign);
router.put("/marketing/:id", updateCampaign);
router.delete("/marketing/:id", deleteCampaign);

module.exports = router;
