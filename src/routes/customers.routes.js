router.post(
  "/quick-add",
  authenticate,
  checkSubscription,
  customersController.quickAddCustomer,
);
