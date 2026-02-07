const express = require("express");
const router = express.Router();
const paymentsController = require("../controllers/payments.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { checkSubscription } = require("../middlewares/subscription.middleware");

router.post(
  "/",
  authenticate,
  checkSubscription,
  paymentsController.recordPayment,
);

module.exports = router;
