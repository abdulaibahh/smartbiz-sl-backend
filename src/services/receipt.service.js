const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

exports.generateReceiptPDF = async ({ business, sale, items, customer }) => {
  const receiptsDir = path.join(__dirname, "../../receipts");

  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir);
  }

  const fileName = `receipt-${sale.receipt_number}.pdf`;
  const filePath = path.join(receiptsDir, fileName);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  /* ---------------- HEADER ---------------- */
  doc.fontSize(18).text(business.name, { align: "center" }).moveDown(0.5);

  doc
    .fontSize(10)
    .text(business.address || "", { align: "center" })
    .moveDown();

  doc.text(`Receipt #: ${sale.receipt_number}`);
  doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`);
  doc.moveDown();

  /* ---------------- CUSTOMER ---------------- */
  if (customer) {
    doc.text(`Customer: ${customer.full_name}`);
    if (customer.phone) doc.text(`Phone: ${customer.phone}`);
    doc.moveDown();
  }

  /* ---------------- ITEMS ---------------- */
  doc.text("Items", { underline: true });
  doc.moveDown(0.5);

  items.forEach((item) => {
    doc.text(
      `${item.name}  |  ${item.quantity} x ${item.price} NLE = ${item.subtotal} NLE`,
    );
  });

  doc.moveDown();

  /* ---------------- TOTALS ---------------- */
  doc.text(`Total: ${sale.total_amount} NLE`);
  doc.text(`Paid: ${sale.amount_paid} NLE`);
  doc.text(`Balance: ${sale.total_amount - sale.amount_paid} NLE`);

  doc.moveDown(2);
  doc.text("Thank you for your business!", { align: "center" });

  doc.end();

  return {
    filePath,
    fileName,
  };
};
