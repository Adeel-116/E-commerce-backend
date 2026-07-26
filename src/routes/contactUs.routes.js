const { Router } = require("express");
const {
  createContactUs,
  getAllContactUs,
  getContactUsById,
  deleteContactUs,
} = require("../controllers/contactUs.controller");

const router = Router();

router.post("/contact-us", createContactUs);
router.get("/contact-us/all", getAllContactUs);
router.get("/contact-us", getContactUsById);
router.delete("/contact-us/delete", deleteContactUs);

module.exports = router;
