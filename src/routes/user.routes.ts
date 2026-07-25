import { Router } from "express";
import {
  getMe,
  updateProfile,
  changePassword,
  updateAddress,
  deleteAddress,
} from "../controllers/user.controller";
import { protect } from "../middleware/auth";
import { userActionLimiter, passwordChangeLimiter } from "../middleware/rateLimit";

const router = Router();

router.get("/me", protect, getMe);
router.patch("/user/profile", protect, updateProfile);
router.patch("/user/change-password", protect, changePassword);
router.post("/user/address", protect, updateAddress);
router.patch("/user/address", protect, updateAddress);
router.delete("/user/address", protect, deleteAddress);

export default router;
