const { Router } = require("express");
const {
  getMe,
  updateProfile,
  changePassword,
  updateAddress,
  deleteAddress,
} = require("../controllers/user.controller");
const { protect } = require("../middleware/auth");
const { userActionLimiter, passwordChangeLimiter } = require("../middleware/rateLimit");

const router = Router();

router.get("/me", protect, getMe);
router.patch("/user/profile", protect, updateProfile);
router.patch("/user/change-password", protect, changePassword);
router.post("/user/address", protect, updateAddress);
router.patch("/user/address", protect, updateAddress);
router.delete("/user/address", protect, deleteAddress);

module.exports = router;
