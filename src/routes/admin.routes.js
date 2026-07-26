const { Router } = require("express");
const multer = require("multer");
const { createProduct, editProduct, deleteProduct, bulkCSVUpload, uploadProductImage } = require("../controllers/product.controller");
const { getAllOrders, updateOrderStatus, updatePaymentStatus, deleteOrder, getOrderEmails } = require("../controllers/order.controller");
const { getDashboardStats } = require("../controllers/dashboard.controller");
const { createDiscount, updateDiscount, deleteDiscount, getAllDiscounts, } = require("../controllers/discount.controller");
const { getAllSubscribers, deleteSubscriber, } = require("../controllers/subscriber.controller");
const { protect, protectAdmin } = require("../middleware/auth");
const { uploadCsv } = require("../middleware/uploadCsv");
const { uploadImage } = require("../middleware/uploadImage");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect, protectAdmin);

// Orders
router.get("/orders", getAllOrders);
router.patch("/orders/status/:orderId", updateOrderStatus);
router.patch("/orders/payment-status/:orderId", updatePaymentStatus);
router.delete("/orders/delete", deleteOrder);
router.get("/get-orders-email", getOrderEmails)

// Product management
router.post("/create-product", upload.none(), createProduct);
router.put("/edit-product", upload.none(), editProduct);
router.delete("/delete-product", deleteProduct);
router.post("/bulk-upload", uploadCsv.single("file"), bulkCSVUpload);
router.post("/upload-image", uploadImage.single("image"), uploadProductImage);

// Dashboard
router.get("/dashboard/stats", getDashboardStats);

// Discounts
router.post("/create/discount", createDiscount);
router.get("/all/discount", getAllDiscounts);
router.delete("/discount/delete", deleteDiscount);
router.put("/discount/update", updateDiscount);

// Subscribers
router.get("/subscribers", getAllSubscribers);
router.delete("/subscribers/delete", deleteSubscriber);

module.exports = router;
