const express = require("express");
const router = express.Router();
const customersController = require("../controllers/customers.controller");

router.get("/", customersController.getCustomers);
router.post("/", customersController.createCustomer);

module.exports = router;
