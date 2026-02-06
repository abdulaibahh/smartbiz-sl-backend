exports.quickAddCustomer = async (req, res) => {
  const { businessId } = req.user;
  const { full_name, phone, email } = req.body;

  if (!full_name || full_name.trim() === "") {
    return res.status(400).json({ message: "Customer name is required" });
  }

  try {
    const result = await req.pool.query(
      `INSERT INTO customers
       (business_id, full_name, phone, email, balance)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING id, full_name, phone, balance`,
      [businessId, full_name.trim(), phone || null, email || null],
    );

    res.status(201).json({
      message: "Customer added successfully",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add customer" });
  }
};
