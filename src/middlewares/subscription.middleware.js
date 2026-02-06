const pool = require("../config/db");

exports.checkSubscription = async (req, res, next) => {
  const { businessId } = req.user;

  try {
    const result = await pool.query(
      `
      SELECT
        trial_ends_at,
        verified,
        ends_at
      FROM subscriptions
      WHERE business_id = $1
      LIMIT 1
      `,
      [businessId],
    );

    if (result.rowCount === 0) {
      return res.status(403).json({
        message: "No subscription found for this business",
      });
    }

    const { trial_ends_at, verified, ends_at } = result.rows[0];
    const now = new Date();

    /* ==============================
       1️⃣ Trial still active
    ============================== */
    if (trial_ends_at && now <= new Date(trial_ends_at)) {
      return next();
    }

    /* ==============================
       2️⃣ Paid subscription active
    ============================== */
    if (verified === true && ends_at && now <= new Date(ends_at)) {
      return next();
    }

    /* ==============================
       3️⃣ Block access
    ============================== */
    return res.status(403).json({
      message:
        "Subscription expired. Please renew to continue using SmartBiz-SL.",
    });
  } catch (error) {
    console.error("Subscription check failed:", error);
    res.status(500).json({ message: "Subscription check failed" });
  }
};
