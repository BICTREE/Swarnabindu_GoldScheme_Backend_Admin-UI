const PDFDocument = require('pdfkit');
const { decryptField } = require('./encryption');

/**
 * Helper to format date nicely (e.g. "04 Sep 2026, 01:30 PM")
 */
function formatReceiptDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');
  return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Generates a branded, professional PDF payment receipt for an installment.
 * Returns a Promise<Buffer> containing the complete PDF data.
 *
 * @param {Object} payment - Populated payment record with userSchemeId (and its schemeId) and userId
 * @param {Object} [latestRate] - Optional latest GoldRate record
 * @returns {Promise<Buffer>}
 */
const generateReceiptPdf = async (payment, latestRate = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Receipt-${payment.invoiceNo || payment.transactionId || payment._id}`,
          Author: 'Bindu Jewellery - Swarna Bindu Gold Scheme',
          Subject: 'Payment Receipt',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const user = payment.userId || {};
      const personalInfo = user.kycDetails?.personalInfo || {};
      const identityInfo = user.kycDetails?.identityVerification || {};
      const userScheme = payment.userSchemeId || {};
      const scheme = userScheme.schemeId || {};

      const receiptNo = payment.invoiceNo || `REC-${String(payment.transactionId || payment._id).slice(-8).toUpperCase()}`;
      const paidDateFormatted = formatReceiptDate(payment.paidAt || payment.createdAt);

      let panNumber = identityInfo.panNumber ? decryptField(identityInfo.panNumber) : null;
      // Mask middle characters if PAN is present (e.g. ABCDE****F)
      if (panNumber && panNumber.length === 10) {
        panNumber = `${panNumber.slice(0, 5)}****${panNumber.slice(9)}`;
      }

      // Calculate gold rate per gram
      let ratePerGram = null;
      if (latestRate) {
        ratePerGram = latestRate.rate22K_per_g || (latestRate.rate24K_per_8g ? (latestRate.rate24K_per_8g / 8) : 7000);
      } else {
        ratePerGram = 7000;
      }

      // Compute gold gained for this payment
      const amountPaid = Number(payment.amount || 0);
      const goldGainedGrams = ratePerGram > 0 ? (amountPaid / ratePerGram) : 0;

      // ── Colors ─────────────────────────────────────────────────────────────
      const goldPrimary = '#9A7B2C';
      const textDark = '#1E293B';
      const textMuted = '#64748B';
      const borderGray = '#E2E8F0';
      const bgLight = '#F8FAFC';

      // ── Outer Decorative Border ────────────────────────────────────────────
      doc
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .lineWidth(1)
        .strokeColor(borderGray)
        .stroke();

      // Top Gold Accent Bar
      doc
        .rect(30, 30, doc.page.width - 60, 6)
        .fill(goldPrimary);

      // ── Header ─────────────────────────────────────────────────────────────
      let y = 50;

      doc
        .fillColor(goldPrimary)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('BINDU JEWELLERY', 50, y, { align: 'left' });

      doc
        .fillColor(textMuted)
        .fontSize(9)
        .font('Helvetica')
        .text('Swarna Bindu Digi Gold Savings Scheme', 50, y + 24)
        .text('support@bindujewellery.com | www.bindujewellery.com', 50, y + 36);

      // Receipt Label on top right
      doc
        .fillColor(textDark)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', doc.page.width - 250, y, { align: 'right', width: 200 });

      doc
        .fillColor(goldPrimary)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`№ ${receiptNo}`, doc.page.width - 250, y + 22, { align: 'right', width: 200 });

      doc
        .fillColor(textMuted)
        .fontSize(9)
        .font('Helvetica')
        .text(`Date: ${paidDateFormatted}`, doc.page.width - 250, y + 36, { align: 'right', width: 200 });

      // Horizontal separator line
      y = 105;
      doc
        .strokeColor(borderGray)
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(doc.page.width - 50, y)
        .stroke();

      // ── Customer & Scheme Section (Two Column Box) ─────────────────────────
      y = 118;
      const boxWidth = (doc.page.width - 110) / 2;
      const boxHeight = 90;

      // Customer Info Box (Left)
      doc.rect(50, y, boxWidth, boxHeight).fillAndStroke(bgLight, borderGray);
      doc
        .fillColor(goldPrimary)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('CUSTOMER DETAILS', 60, y + 10);

      const customerName = personalInfo.fullName || user.mobileNumber || 'Valued Customer';
      doc
        .fillColor(textDark)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(customerName, 60, y + 26);

      doc
        .fillColor(textMuted)
        .fontSize(9)
        .font('Helvetica')
        .text(`Mobile: ${user.mobileNumber || 'N/A'}`, 60, y + 42)
        .text(`Email: ${personalInfo.email || 'N/A'}`, 60, y + 56);

      if (panNumber) {
        doc.text(`PAN: ${panNumber}`, 60, y + 70);
      }

      // Scheme & Payment Info Box (Right)
      const rightBoxX = 50 + boxWidth + 10;
      doc.rect(rightBoxX, y, boxWidth, boxHeight).fillAndStroke(bgLight, borderGray);
      doc
        .fillColor(goldPrimary)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('ENROLLMENT DETAILS', rightBoxX + 10, y + 10);

      doc
        .fillColor(textDark)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(scheme.name || 'Swarna Bindu Gold Scheme', rightBoxX + 10, y + 26);

      doc
        .fillColor(textMuted)
        .fontSize(9)
        .font('Helvetica')
        .text(`Account / Subscription ID: ${String(userScheme._id || 'N/A').slice(-10)}`, rightBoxX + 10, y + 42)
        .text(`Payment Mode: ${(payment.paymentMethod || 'Online UPI').toUpperCase()}`, rightBoxX + 10, y + 56)
        .text(`Ref / Txn ID: ${payment.transactionId || payment.razorpayOrderId || 'N/A'}`, rightBoxX + 10, y + 70);

      // ── Payment Particulars Table ──────────────────────────────────────────
      y = 225;
      doc
        .fillColor(textDark)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TRANSACTION BREAKDOWN', 50, y);

      y = 245;
      const tableX = 50;
      const tableW = doc.page.width - 100;

      // Table Header Row
      doc.rect(tableX, y, tableW, 24).fill(goldPrimary);
      doc
        .fillColor('#FFFFFF')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', tableX + 15, y + 7)
        .text('GOLD RATE (PER G)', tableX + 220, y + 7)
        .text('GOLD CREDITED', tableX + 330, y + 7)
        .text('AMOUNT (INR)', tableX + 410, y + 7, { align: 'right', width: 75 });

      // Table Data Row
      y += 24;
      doc.rect(tableX, y, tableW, 36).fillAndStroke(bgLight, borderGray);

      const goldRateText = ratePerGram ? `₹${Number(ratePerGram.toFixed(2)).toLocaleString('en-IN')}/g` : 'N/A';
      const weightCredited = goldGainedGrams > 0 ? `${goldGainedGrams.toFixed(3)} g` : '—';

      doc
        .fillColor(textDark)
        .fontSize(9)
        .font('Helvetica')
        .text('Monthly Gold Scheme Installment', tableX + 15, y + 8)
        .fillColor(textMuted)
        .fontSize(8)
        .text(`Status: ${(payment.status || 'SUCCESSFUL').toUpperCase()}`, tableX + 15, y + 20);

      doc
        .fillColor(textDark)
        .fontSize(9)
        .font('Helvetica')
        .text(goldRateText, tableX + 220, y + 12)
        .text(weightCredited, tableX + 330, y + 12)
        .font('Helvetica-Bold')
        .text(`₹${amountPaid.toLocaleString('en-IN')}.00`, tableX + 410, y + 12, { align: 'right', width: 75 });

      // Convenience Fee / GST row if present
      y += 36;
      const fee = Number(payment.convenienceFee || 0) + Number(payment.gst || 0);
      if (fee > 0) {
        doc.rect(tableX, y, tableW, 24).fillAndStroke('#FFF7ED', borderGray);
        doc
          .fillColor(textDark)
          .fontSize(9)
          .font('Helvetica')
          .text('Platform / Processing Fee', tableX + 15, y + 7);
        doc
          .font('Helvetica-Bold')
          .text(`₹${fee.toLocaleString('en-IN')}.00`, tableX + 410, y + 7, { align: 'right', width: 75 });
        y += 24;
      }

      // Total Row
      const totalAmount = amountPaid + fee;
      doc.rect(tableX, y, tableW, 30).fillAndStroke('#FEFCE8', goldPrimary);
      doc
        .fillColor(goldPrimary)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('NET AMOUNT PAID', tableX + 15, y + 9);

      doc
        .fillColor(goldPrimary)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`₹${totalAmount.toLocaleString('en-IN')}.00`, tableX + 360, y + 9, { align: 'right', width: 125 });

      // ── Cumulative Progress Summary ────────────────────────────────────────
      y += 45;
      doc
        .fillColor(textDark)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('CUMULATIVE SCHEME SAVINGS SUMMARY', 50, y);

      y += 18;
      const colW = (tableW - 20) / 3;

      // Col 1: Total Gold Saved
      doc.rect(50, y, colW, 55).fillAndStroke(bgLight, borderGray);
      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text('TOTAL GOLD ACCUMULATED', 60, y + 10);
      const totalGold = userScheme.goldAccumulated ?? goldGainedGrams;
      doc
        .fillColor(goldPrimary)
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(`${Number(totalGold).toFixed(3)} grams`, 60, y + 26);

      // Col 2: Total Amount Deposited
      doc.rect(50 + colW + 10, y, colW, 55).fillAndStroke(bgLight, borderGray);
      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text('TOTAL AMOUNT INVESTED', 50 + colW + 20, y + 10);
      const totalPaid = userScheme.totalPaid ?? totalAmount;
      doc
        .fillColor(textDark)
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(`₹${Number(totalPaid).toLocaleString('en-IN')}.00`, 50 + colW + 20, y + 26);

      // Col 3: Installments Paid
      doc.rect(50 + (colW + 10) * 2, y, colW, 55).fillAndStroke(bgLight, borderGray);
      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text('INSTALLMENTS COMPLETED', 50 + (colW + 10) * 2 + 10, y + 10);
      const monthlyInv = userScheme.monthlyInvestment || 1;
      const instCount = Math.floor(totalPaid / monthlyInv);
      doc
        .fillColor(textDark)
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(`${instCount} Installments`, 50 + (colW + 10) * 2 + 10, y + 26);

      // ── Terms & Verification Note ──────────────────────────────────────────
      y += 75;
      doc
        .fillColor(textDark)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('TERMS & CONDITIONS:', 50, y);

      y += 14;
      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text('1. Gold weight is allocated based on the approved 22K/24K market gold rate on the date and time of confirmed payment receipt.', 50, y, { width: tableW })
        .text('2. Accumulated gold can be redeemed in the form of fine jewellery/coins as per the terms of the Swarna Bindu Scheme.', 50, y + 12, { width: tableW })
        .text('3. This is a computer-generated receipt authenticated by Bindu Jewellery and requires no physical signature.', 50, y + 24, { width: tableW });

      // ── Footer ─────────────────────────────────────────────────────────────
      const footerY = doc.page.height - 70;
      doc
        .strokeColor(borderGray)
        .lineWidth(1)
        .moveTo(50, footerY)
        .lineTo(doc.page.width - 50, footerY)
        .stroke();

      doc
        .fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text('Bindu Jewellery | Quality & Trust since inception', 50, footerY + 8, { align: 'center', width: doc.page.width - 100 })
        .text('Helpdesk: support@bindujewellery.com | Ph: +91 98765 43210', 50, footerY + 18, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateReceiptPdf,
};
