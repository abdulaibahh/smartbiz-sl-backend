const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ==============================
   SIGNUP (OWNER)
============================== */
exports.signup = async (req, res) => {
  const { full_name, email, password, business_name, address } = req.body;

  try {
    /* ------------------------------
       1️⃣ Check email uniqueness
    ------------------------------- */
    const emailCheck = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email],
    );

    if (emailCheck.rowCount > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    /* ------------------------------
       2️⃣ Hash password
    ------------------------------- */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* ------------------------------
       3️⃣ Create owner user
    ------------------------------- */
    const userResult = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'owner')
       RETURNING id`,
      [full_name, email, hashedPassword],
    );

    const ownerId = userResult.rows[0].id;

    /* ------------------------------
       4️⃣ Create business
    ------------------------------- */
    const businessResult = await pool.query(
      `INSERT INTO businesses (owner_id, name, address)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [ownerId, business_name, address],
    );

    const businessId = businessResult.rows[0].id;

    /* ------------------------------
       5️⃣ Attach business to owner
    ------------------------------- */
    await pool.query(`UPDATE users SET business_id = $1 WHERE id = $2`, [
      businessId,
      ownerId,
    ]);

    /* ------------------------------
       6️⃣ Create trial subscription
    ------------------------------- */
    await pool.query(
      `INSERT INTO subscriptions
       (business_id, plan, amount, starts_at, ends_at, verified)
       VALUES (
         $1,
         'trial',
         0,
         CURRENT_TIMESTAMP,
         CURRENT_TIMESTAMP + INTERVAL '30 days',
         TRUE
       )`,
      [businessId],
    );

    /* ------------------------------
       7️⃣ Generate JWT
    ------------------------------- */
    const token = jwt.sign(
      {
        userId: ownerId,
        businessId,
        role: "owner",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Signup successful",
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
};

/* ==============================
   LOGIN
============================== */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT id, password_hash, role, business_id
       FROM users
       WHERE email = $1 AND is_active = TRUE`,
      [email],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        businessId: user.business_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};
