const express = require("express");
const router = express.Router();
const salesController = require("../controllers/sales.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { checkSubscription } = require("../middlewares/subscription.middleware");

router.post(
  "/quick-sale",
  authenticate,
  checkSubscription,
  salesController.createQuickSale,
);

module.exports = router;
