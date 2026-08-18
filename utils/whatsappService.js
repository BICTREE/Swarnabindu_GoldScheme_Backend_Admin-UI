/**
 * WhatsApp Notification Service for Swarna Bindu Gold Scheme
 * Supports:
 *  1. Payment Reminder
 *  2. Payment Successful Receipt
 *  3. New Scheme Joined Confirmation
 * 
 * In MOCK_MODE=true (development), logs formatted WhatsApp messages to console cleanly.
 * In MOCK_MODE=false (production), sends via Meta WhatsApp Business API / Interakt / Twilio / UltraMsg.
 */

/**
 * Core function to send WhatsApp messages
 */
const sendWhatsAppMessage = async ({ mobileNumber, templateName, parameters, textMessage }) => {
  try {
    // 🧪 MOCK_MODE: Log formatted message to console during development
    if (process.env.MOCK_MODE === 'true' || !process.env.WHATSAPP_API_TOKEN) {
      console.log('\n💬 [WHATSAPP MESSAGE SENT (MOCK_MODE)]');
      console.log(`   📱 To Mobile: ${mobileNumber}`);
      console.log(`   📋 Template: ${templateName}`);
      console.log(`   ✉️  Message:\n${textMessage}`);
      console.log('═'.repeat(60) + '\n');
      return { success: true, mocked: true };
    }

    // 🚀 PRODUCTION: Meta WhatsApp Business API Integration
    const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: mobileNumber.replace('+', ''), // E.164 format without +
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: parameters.map(p => ({ type: 'text', text: String(p) }))
          }
        ]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`✅ WhatsApp message delivered to ${mobileNumber}`);
    return { success: true, data };
  } catch (error) {
    console.error(`❌ WhatsApp sending failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * 🔔 1. Send WhatsApp Payment Reminder
 */
const sendPaymentReminderWhatsApp = async ({ mobileNumber, userName, schemeName, dueAmount, dueDate }) => {
  const textMessage = 
`Hello ${userName || 'Valued Customer'}, 🔔

This is a friendly reminder for your *Swarna Bindu Gold Scheme* installment!

📦 *Scheme:* ${schemeName}
💰 *Due Amount:* ₹${dueAmount.toLocaleString('en-IN')}
📅 *Due Date:* ${dueDate}

Pay on or before the due date to keep accumulating gold hassle-free.

Pay now in your Swarna Bindu App! ✨`;

  return await sendWhatsAppMessage({
    mobileNumber,
    templateName: 'payment_reminder_template',
    parameters: [userName || 'Customer', schemeName, dueAmount, dueDate],
    textMessage
  });
};

/**
 * 💳 2. Send WhatsApp Payment Successful Receipt
 */
const sendPaymentSuccessWhatsApp = async ({ mobileNumber, userName, schemeName, amountPaid, goldGainedGrams, totalGoldGrams, invoiceNo, transactionId }) => {
  const textMessage = 
`Payment Successful! 🎉

Dear ${userName || 'Customer'}, your installment payment has been received and verified.

🧾 *Invoice No:* ${invoiceNo}
💳 *Transaction ID:* ${transactionId}
📦 *Scheme:* ${schemeName}
💵 *Amount Paid:* ₹${amountPaid.toLocaleString('en-IN')}
✨ *Gold Credited:* ${goldGainedGrams} grams
🌟 *Total Gold Accumulated:* ${totalGoldGrams} grams

Thank you for choosing Swarna Bindu for your gold savings journey! 🥇`;

  return await sendWhatsAppMessage({
    mobileNumber,
    templateName: 'payment_success_template',
    parameters: [userName || 'Customer', invoiceNo, schemeName, amountPaid, goldGainedGrams, totalGoldGrams],
    textMessage
  });
};

/**
 * 📜 3. Send WhatsApp New Scheme Subscription Confirmation
 */
const sendNewSchemeJoinedWhatsApp = async ({ mobileNumber, userName, schemeName, monthlyInvestment, durationMonths, goalGoldGram }) => {
  const textMessage = 
`Welcome to Swarna Bindu! 🎉

Dear ${userName || 'Customer'}, you have successfully joined the *${schemeName}* plan!

📅 *Duration:* ${durationMonths} Months
💰 *Monthly Savings Target:* ₹${monthlyInvestment.toLocaleString('en-IN')}
🥇 *Goal Gold Weight Target:* ~${goalGoldGram} grams

Start accumulating gold every month and get maturity bonus benefits!

View your plan details in your Swarna Bindu App. ✨`;

  return await sendWhatsAppMessage({
    mobileNumber,
    templateName: 'new_scheme_joined_template',
    parameters: [userName || 'Customer', schemeName, monthlyInvestment, durationMonths, goalGoldGram],
    textMessage
  });
};

module.exports = {
  sendWhatsAppMessage,
  sendPaymentReminderWhatsApp,
  sendPaymentSuccessWhatsApp,
  sendNewSchemeJoinedWhatsApp
};
