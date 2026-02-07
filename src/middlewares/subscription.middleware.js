const pool = require("../config/db");

exports.checkAccess = async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(403).json({
        message: "Business context missing",
      });
    }

    const result = await pool.query(
      `
      SELECT plan, ends_at
      FROM subscriptions
      WHERE business_id = $1
        AND ends_at > CURRENT_TIMESTAMP
      ORDER BY ends_at DESC
      LIMIT 1
      `,
      [businessId],
    );

    if (result.rowCount === 0) {
      return res.status(402).json({
        message: "Trial or subscription expired. Please subscribe to continue.",
      });
    }

    // Attach plan info if needed later
    req.subscription = result.rows[0];

    next();
  } catch (error) {
    console.error("Access check failed:", error);
    res.status(500).json({ message: "Access check failed" });
  }
};
