const { Router } = require("express");
const productRouter = require("./product.routes");
const authRouter = require("./auth.routes");
const userRouter = require("./user.routes");
const cartRouter = require("./cart.routes");
const checkoutRouter = require("./checkout.routes");
const orderRouter = require("./order.routes");
const bundleRouter = require('./bundle.routes')
const contactUsRouter = require("./contactUs.routes");
const subscriberRouter = require("./subscriber.routes");
const adminRouter = require("./admin.routes");
const analyticsRouter = require("./analytics.routes");

const router = Router();
router.get("/banners", require("../controllers/banner.controller").listBanners);
router.get("/reviews", require("../controllers/review.controller").listPublicReviews);
router.get("/categories", require("../controllers/category.controller").listPublicCategories);

router.use(productRouter);
router.use(authRouter);
router.use(userRouter);
router.use(cartRouter);
router.use(checkoutRouter);
router.use(orderRouter);
router.use(bundleRouter);
router.use(contactUsRouter);
router.use(subscriberRouter);
router.use(analyticsRouter);
router.use("/admin", adminRouter);

module.exports = router;
