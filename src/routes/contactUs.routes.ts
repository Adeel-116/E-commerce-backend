import { Router } from "express";
import {
  createContactUs,
  getAllContactUs,
  getContactUsById,
  deleteContactUs,
} from "../controllers/contactUs.controller";

const router = Router();

router.post("/contact-us", createContactUs);
router.get("/contact-us/all", getAllContactUs);
router.get("/contact-us", getContactUsById);
router.delete("/contact-us/delete", deleteContactUs);

export default router;
