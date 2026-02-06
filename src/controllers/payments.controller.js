const pool = require("../config/db");

exports.recordPayment = async (req, res) => {
  const client = await pool.connect();
  const { businessId, userId } = req.user;
  const { customer_id, amount, payment_method, reference, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid payment amount" });
  }

  try {
    await client.query("BEGIN");

    // 1. Verify customer belongs to business
    const customerRes = await client.query(
      `SELECT balance
       FROM customers
       WHERE id = $1 AND business_id = $2 AND is_active = TRUE`,
      [customer_id, businessId],
    );

    if (customerRes.rowCount === 0) {
      throw new Error("Customer not found");
    }

    // 2. Insert payment
    await client.query(
      `INSERT INTO payments
       (business_id, customer_id, user_id, amount, payment_method, reference, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        businessId,
        customer_id,
        userId,
        amount,
        payment_method,
        reference,
        notes,
      ],
    );

    // 3. Reduce customer balance
    await client.query(
      `UPDATE customers
       SET balance = balance - $1
       WHERE id = $2`,
      [amount, customer_id],
    );

    await client.query("COMMIT");

    res.status(201).json({ message: "Payment recorded successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: error.message || "Payment failed" });
  } finally {
    client.release();
  }
};
