import { Router } from "express";
import productRouter from "./product.routes";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import cartRouter from "./cart.routes";
import checkoutRouter from "./checkout.routes";
import orderRouter from "./order.routes";
import bundleRouter from './bundle.routes'
import contactUsRouter from "./contactUs.routes";
import subscriberRouter from "./subscriber.routes";
import adminRouter from "./admin.routes";

const router = Router();

router.use(productRouter);
router.use(authRouter);
router.use(userRouter);
router.use(cartRouter);
router.use(checkoutRouter);
router.use(orderRouter);
router.use(bundleRouter);
router.use(contactUsRouter);
router.use(subscriberRouter);
router.use("/admin", adminRouter);

export default router;
