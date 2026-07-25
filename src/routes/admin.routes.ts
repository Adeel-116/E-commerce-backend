import { Router } from "express";
import multer from "multer";
import { createProduct, editProduct, deleteProduct, bulkCSVUpload, uploadProductImage } from "../controllers/product.controller";
import { getAllOrders, updateOrderStatus, updatePaymentStatus, deleteOrder, getOrderEmails} from "../controllers/order.controller";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { createDiscount, updateDiscount, deleteDiscount, getAllDiscounts, } from "../controllers/discount.controller";
import { getAllSubscribers, deleteSubscriber, } from "../controllers/subscriber.controller";
import { protect, protectAdmin } from "../middleware/auth";
import { uploadCsv } from "../middleware/uploadCsv";
import { uploadImage } from "../middleware/uploadImage";

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

export default router;
