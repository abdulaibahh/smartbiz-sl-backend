require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const salesRoutes = require("./routes/sales.routes");
const paymentsRoutes = require("./routes/payments.routes");

const { errorHandler } = require("./middlewares/error.middleware");

const app = express();

/* ==============================
   GLOBAL MIDDLEWARE
============================== */
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-frontend-domain.com"]
        : "*",
  }),
);

app.use(express.json());
app.disable("x-powered-by");

/* ==============================
   ROUTES
============================== */
app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/payments", paymentsRoutes);

/* ==============================
   HEALTH CHECK
============================== */
app.get("/", (req, res) => {
  res.send("SmartBiz-SL API is running");
});

/* ==============================
   ERROR HANDLER (LAST)
============================== */
app.use(errorHandler);

/* ==============================
   SERVER
============================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SmartBiz-SL backend running on port ${PORT}`);
});
