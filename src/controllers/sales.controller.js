const pool = require("../config/db");
const { generateReceiptPDF } = require("../services/receipt.service");
const { sendReceiptEmail } = require("../services/email.service");

exports.createQuickSale = async (req, res) => {
  const client = await pool.connect();

  let saleId;
  let customerId;
  let receiptNumber;
  let totalAmount = 0;

  try {
    await client.query("BEGIN");

    const { businessId, userId } = req.user;
    const {
      customer_id,
      customer_name,
      customer_phone,
      payment_type,
      amount_paid,
      items,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No sale items provided" });
    }

    receiptNumber = `SB-${Date.now()}`;
    customerId = customer_id || null;

    /* ==============================
       1️⃣ AUTO-CREATE CUSTOMER (CREDIT)
    =============================== */
    if (payment_type === "credit" && !customerId) {
      if (!customer_name || customer_name.trim() === "") {
        return res.status(400).json({
          message: "Customer name is required for credit sale",
        });
      }

      const customerRes = await client.query(
        `INSERT INTO customers
         (business_id, full_name, phone, balance)
         VALUES ($1,$2,$3,0)
         RETURNING id`,
        [businessId, customer_name.trim(), customer_phone || null],
      );

      customerId = customerRes.rows[0].id;
    }

    /* ==============================
       2️⃣ CALCULATE TOTAL + STOCK CHECK
    =============================== */
    for (const item of items) {
      const productRes = await client.query(
        `SELECT price, quantity_in_stock, track_stock
         FROM products
         WHERE id = $1 AND business_id = $2 AND is_active = TRUE`,
        [item.product_id, businessId],
      );

      if (productRes.rowCount === 0) {
        throw new Error("Product not found");
      }

      const product = productRes.rows[0];

      if (product.track_stock && product.quantity_in_stock < item.quantity) {
        throw new Error("Insufficient stock");
      }

      totalAmount += Number(product.price) * item.quantity;
    }

    /* ==============================
       3️⃣ CREATE SALE
    =============================== */
    const saleRes = await client.query(
      `INSERT INTO sales (
        business_id, user_id, customer_id,
        total_amount, amount_paid,
        payment_type, receipt_number, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, created_at`,
      [
        businessId,
        userId,
        customerId,
        totalAmount,
        amount_paid || 0,
        payment_type,
        receiptNumber,
        notes || null,
      ],
    );

    saleId = saleRes.rows[0].id;
    const saleDate = saleRes.rows[0].created_at;

    /* ==============================
       4️⃣ SALE ITEMS + STOCK UPDATE
    =============================== */
    for (const item of items) {
      const productRes = await client.query(
        `SELECT price, track_stock
         FROM products
         WHERE id = $1`,
        [item.product_id],
      );

      const price = Number(productRes.rows[0].price);
      const subtotal = price * item.quantity;

      await client.query(
        `INSERT INTO sale_items
         (sale_id, product_id, quantity, price, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [saleId, item.product_id, item.quantity, price, subtotal],
      );

      await client.query(
        `UPDATE products
         SET quantity_in_stock = quantity_in_stock - $1
         WHERE id = $2 AND track_stock = TRUE`,
        [item.quantity, item.product_id],
      );
    }

    /* ==============================
       5️⃣ HANDLE DEBT
    =============================== */
    if (customerId && payment_type !== "cash") {
      const creditAmount = totalAmount - (amount_paid || 0);

      if (creditAmount > 0) {
        await client.query(
          `UPDATE customers
           SET balance = balance + $1
           WHERE id = $2 AND business_id = $3`,
          [creditAmount, customerId, businessId],
        );
      }
    }

    await client.query("COMMIT");

    /* ==============================
       6️⃣ GENERATE PDF RECEIPT (AFTER COMMIT)
    =============================== */

    const businessRes = await pool.query(
      `SELECT name, address FROM businesses WHERE id = $1`,
      [businessId],
    );

    const itemsRes = await pool.query(
      `SELECT p.name, si.quantity, si.price, si.subtotal
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = $1`,
      [saleId],
    );

    let customer = null;
    if (customerId) {
      const customerRes = await pool.query(
        `SELECT full_name, phone, email
         FROM customers
         WHERE id = $1`,
        [customerId],
      );
      customer = customerRes.rows[0];
    }

    const receipt = await generateReceiptPDF({
      business: businessRes.rows[0],
      sale: {
        receipt_number: receiptNumber,
        total_amount: totalAmount,
        amount_paid: amount_paid || 0,
        created_at: saleDate,
      },
      items: itemsRes.rows,
      customer,
    });

    /* ==============================
       7️⃣ SEND RECEIPT EMAIL (NON-BLOCKING)
    =============================== */
    if (customer?.email) {
      sendReceiptEmail({
        to: customer.email,
        businessName: businessRes.rows[0].name,
        receiptNumber,
        pdfFileName: receipt.fileName,
      }).catch((err) => {
        console.error("Receipt email failed:", err.message);
      });
    }

    res.status(201).json({
      message: "Sale completed successfully",
      sale_id: saleId,
      receipt_number: receiptNumber,
      receipt_pdf: receipt.fileName,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: error.message || "Sale failed" });
  } finally {
    client.release();
  }
};
