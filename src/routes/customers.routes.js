const express = require("express");
const router = express.Router();

const customersController = require("../controllers/customers.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { checkSubscription } = require("../middlewares/subscription.middleware");

/* ======================
   PROTECTED CUSTOMER ROUTES
====================== */
router.use(authenticate, checkSubscription);

router.get("/", customersController.getCustomers);
router.post("/", customersController.createCustomer);

module.exports = router;
