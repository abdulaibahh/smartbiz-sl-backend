require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const salesRoutes = require("./routes/sales.routes");
const paymentsRoutes = require("./routes/payments.routes");

const { authenticate } = require("./middlewares/auth.middleware");
const { checkSubscription } = require("./middlewares/subscription.middleware");
const { errorHandler } = require("./middlewares/error.middleware");

const app = express();

/* ======================
   GLOBAL MIDDLEWARES
====================== */
app.use(cors());
app.use(express.json());

/* ======================
   PUBLIC ROUTES
====================== */
app.use("/api/auth", authRoutes);

/* ======================
   PROTECTED ROUTES
====================== */
// app.use("/api", authenticate, checkSubscription);
app.use("/api/sales", salesRoutes);
app.use("/api/payments", paymentsRoutes);

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.send("SmartBiz-SL API is running");
});

/* ======================
   ERROR HANDLER
====================== */
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SmartBiz-SL backend running on port ${PORT}`);
});
