const nodemailer = require("nodemailer");
const path = require("path");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.RECEIPT_EMAIL,
    pass: process.env.RECEIPT_EMAIL_PASSWORD,
  },
});

exports.sendReceiptEmail = async ({
  to,
  businessName,
  receiptNumber,
  pdfFileName,
}) => {
  const pdfPath = path.join(__dirname, "../../receipts", pdfFileName);

  const mailOptions = {
    from: `"${businessName}" <${process.env.RECEIPT_EMAIL}>`,
    to,
    subject: `Your receipt from ${businessName}`,
    text: `Thank you for your purchase.\nReceipt Number: ${receiptNumber}`,
    attachments: [
      {
        filename: pdfFileName,
        path: pdfPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};
