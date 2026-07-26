const { Router } = require("express");
const { subscribeEmail } = require("../controllers/subscriber.controller");

const router = Router();

router.post("/subscribe", subscribeEmail);

module.exports = router;
