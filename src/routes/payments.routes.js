const express = require("express");
const router = express.Router();
const paymentsController = require("../controllers/payments.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { checkSubscription } = require("../middlewares/subscription.middleware");
router.use(authenticate, checkSubscription);

router.post("/verify", paymentsController.verifyPayment);


module.exports = router;
