const pool = require("../config/db");

/**
 * GET /api/customers
 */
exports.getCustomers = async (req, res, next) => {
  try {
    const { businessId } = req.user;

    const result = await pool.query(
      `
      SELECT id, name, phone, email, created_at
      FROM customers
      WHERE business_id = $1
      ORDER BY created_at DESC
      `,
      [businessId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get customers error:", error);
    next(error);
  }
};

/**
 * POST /api/customers
 */
exports.createCustomer = async (req, res, next) => {
  try {
    const { businessId } = req.user;
    const { name, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    const result = await pool.query(
      `
      INSERT INTO customers (business_id, name, phone, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [businessId, name, phone || null, email || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create customer error:", error);
    next(error);
  }
};
