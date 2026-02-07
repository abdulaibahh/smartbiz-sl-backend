router.use(authenticate, checkSubscription);

router.get("/", customersController.getCustomers);
router.post("/", customersController.createCustomer);
