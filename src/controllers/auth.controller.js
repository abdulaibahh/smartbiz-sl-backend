const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  const { full_name, email, password, business_name, address } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Create owner user
    const userResult = await client.query(
      `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, 'owner')
      RETURNING id
      `,
      [full_name, email, hashedPassword],
    );

    const ownerId = userResult.rows[0].id;

    // 3. Create business
    const businessResult = await client.query(
      `
      INSERT INTO businesses (owner_id, name, address)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [ownerId, business_name, address],
    );

    const businessId = businessResult.rows[0].id;

    // 4. Attach business to owner
    await client.query(
      `
      UPDATE users
      SET business_id = $1
      WHERE id = $2
      `,
      [businessId, ownerId],
    );

    // 5. ✅ CREATE TRIAL SUBSCRIPTION (OPTION A)
    await client.query(
      `
      INSERT INTO subscriptions (
        business_id,
        plan,
        verified,
        starts_at,
        ends_at
      )
      VALUES (
        $1,
        'trial',
        true,
        NOW(),
        NOW() + INTERVAL '14 days'
      )
      `,
      [businessId],
    );

    await client.query("COMMIT");

    // 6. Issue JWT
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
    await client.query("ROLLBACK");
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed" });
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT id, password_hash, role, business_id
      FROM users
      WHERE email = $1 AND is_active = TRUE
      `,
      [email],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
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
