const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Notification = require('../models/Notification');
const GoldRate = require('../models/GoldRate');
const AuditLog = require('../models/AuditLog');

// Temporary in-memory OTP store: mobileNumber -> { otp, expires }
const otpStore = new Map();

/**
 * Generate 6-digit numeric OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store OTP with 5 minutes expiry
 */
const saveOTP = (mobileNumber, otp) => {
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now
  otpStore.set(mobileNumber, { otp, expires });
};

/**
 * Verify OTP
 * When MOCK_MODE=true in .env, any mobile number can use the fixed MOCK_OTP (e.g. 123456)
 * so Flutter developers can test without real SMS delivery.
 */
const verifyOTP = (mobileNumber, otp) => {
  // 🧪 MOCK_MODE: Accept a fixed OTP for any mobile number (for Flutter developer integration)
  if (process.env.MOCK_MODE === 'true' && otp === process.env.MOCK_OTP) {
    console.log(`\n🧪 [MOCK_MODE] OTP bypass accepted for: ${mobileNumber}\n`);
    return true;
  }

  const record = otpStore.get(mobileNumber);
  if (!record) return false;

  const { otp: savedOtp, expires } = record;
  if (new Date() > expires) {
    otpStore.delete(mobileNumber);
    return false;
  }

  if (savedOtp === otp) {
    otpStore.delete(mobileNumber); // Use once
    return true;
  }

  return false;
};

/**
 * Generate JWT Access Token (15 minutes)
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m'
  });
};

/**
 * Generate JWT Refresh Token (7 days)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
};

/**
 * Send Mock Push Notification (creates a notification record and simulates sending to deviceToken)
 */
const sendMockNotification = async (userId, title, message, type) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type
    });

    console.log(`\n🔔 [PUSH NOTIFICATION SENT]`);
    console.log(`   To User ID: ${userId}`);
    console.log(`   Title: ${title}`);
    console.log(`   Message: ${message}`);
    console.log(`   Type: ${type}\n`);

    return notification;
  } catch (error) {
    console.error(`Error sending mock notification: ${error.message}`);
  }
};

/**
 * Fluctuates gold rates slightly to mock market movements
 */
const fluctuateGoldRates = async () => {
  try {
    const latestRate = await GoldRate.findOne().sort({ lastUpdated: -1 });
    if (!latestRate) return;

    // Fluctuates by up to +/- 0.5%
    const changePercent = (Math.random() * 1 - 0.5) / 100;
    
    const newRate22K = Math.round(latestRate.rate22K_per_g * (1 + changePercent) * 100) / 100;
    // Keep 24k rate proportional (24K 8g is usually ~8x 24K 1g, let's keep the baseline relative)
    const newRate24K = Math.round(latestRate.rate24K_per_8g * (1 + changePercent) * 100) / 100;

    await GoldRate.create({
      rate22K_per_g: newRate22K,
      rate24K_per_8g: newRate24K,
      lastUpdated: new Date()
    });

    console.log(`💹 [GOLD RATE AUTO-UPDATED] 22K (1g): ₹${newRate22K} | 24K (8g): ₹${newRate24K}`);
  } catch (error) {
    console.error(`Error fluctuating gold rates: ${error.message}`);
  }
};

/**
 * Log an administrative action to the AuditLog collection
 */
const logAdminAction = async (adminId, action, targetEntity, targetId, details, req = null) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    await AuditLog.create({
      adminId,
      action,
      targetEntity,
      targetId,
      details,
      ipAddress
    });
    console.log(`📝 [AUDIT LOGGED] Action: ${action} by Admin: ${adminId} on ${targetEntity}: ${targetId}`);
  } catch (error) {
    console.error(`Failed to log admin audit action: ${error.message}`);
  }
};

module.exports = {
  generateOTP,
  saveOTP,
  verifyOTP,
  generateAccessToken,
  generateRefreshToken,
  sendMockNotification,
  fluctuateGoldRates,
  logAdminAction
};
