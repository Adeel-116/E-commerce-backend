import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  GetAccessTokenBasedOnRefreshToken,
  loginAdmin,
  logoutAdmin,
  getAdminAccessToken,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller";
import {
  userLoginLimiter,
  userRegistrationLimiter,
  forgotPasswordLimiter,
  otpVerifyLimiter,
  passwordChangeLimiter,
} from "../middleware/rateLimit";

const router = Router();

// User auth
router.post("/user-registration", userRegistrationLimiter , registerUser);
router.post("/user-login", userLoginLimiter, loginUser);
router.post("/logout-user", logoutUser);
router.get("/refresh-token", GetAccessTokenBasedOnRefreshToken);

// Forgot password
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/verify-reset-otp", otpVerifyLimiter, verifyResetOtp);
router.post("/reset-password", passwordChangeLimiter, resetPassword);

// Admin auth
router.post("/admin-login", userLoginLimiter, loginAdmin);
router.post("/logout-admin", logoutAdmin);
router.get("/admin/refresh-token", getAdminAccessToken);

export default router;
