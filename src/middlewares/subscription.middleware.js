const pool = require("../config/db");

exports.checkSubscription = async (req, res, next) => {
  try {
    const { businessId } = req.user;

    if (!businessId) {
      return res.status(401).json({ message: "Invalid auth token" });
    }

    const result = await pool.query(
      `
      SELECT id
      FROM subscriptions
      WHERE business_id = $1
        AND verified = true
        AND ends_at > NOW()
      LIMIT 1
      `,
      [businessId],
    );

    if (result.rowCount === 0) {
      return res.status(403).json({
        message: "No active subscription. Please subscribe to continue.",
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error.message);
    res.status(500).json({ message: "Subscription system error" });
  }
};
