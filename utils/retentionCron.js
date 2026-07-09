const User = require('../models/User');
const Consent = require('../models/Consent');
const UserScheme = require('../models/UserScheme');
const Payment = require('../models/Payment');
const GrievanceTicket = require('../models/GrievanceTicket');
const fs = require('fs');
const path = require('path');

/**
 * Perform a sweep of the database to enforce DPDP Act data erasure and PMLA retention limits.
 * Intended to run once daily via scheduler (e.g. node-cron or Agenda).
 */
const runRetentionSweep = async () => {
  console.log('⏰ Starting Regulatory Data Retention Expiry Sweep...');
  const now = new Date();

  try {
    // 1. Process fully expired accounts (PMLA 5-year buffer completed post account closure/anonymization)
    const expiredUsers = await User.find({ dataRetentionExpiry: { $lt: now } });
    
    if (expiredUsers.length > 0) {
      console.log(`🧹 Found ${expiredUsers.length} fully expired accounts. Purging all references...`);
      for (const user of expiredUsers) {
        // Erase related records
        await Consent.deleteMany({ userId: user._id });
        await UserScheme.deleteMany({ userId: user._id });
        await Payment.deleteMany({ userId: user._id });
        await GrievanceTicket.deleteMany({ userId: user._id });
        
        // Remove profile photo if any exists
        if (user.kycDetails?.personalInfo?.profilePicture) {
          const profilePicPath = path.join(__dirname, '..', user.kycDetails.personalInfo.profilePicture);
          if (fs.existsSync(profilePicPath)) {
            fs.unlinkSync(profilePicPath);
          }
        }

        // Delete user fully
        await User.findByIdAndDelete(user._id);
        console.log(`✓ Completely purged User ID: ${user._id}`);
      }
    }

    // 2. Process expired Biometric (Selfie) records (shorter retention policy, e.g. delete 90 days post verification approval)
    const usersWithExpiredSelfies = await User.find({
      'kycDetails.selfieVerification.dataRetentionExpiry': { $lt: now }
    });

    if (usersWithExpiredSelfies.length > 0) {
      console.log(`🧹 Found ${usersWithExpiredSelfies.length} expired biometric selfie records. Deleting file payloads...`);
      for (const user of usersWithExpiredSelfies) {
        const selfiePathRelative = user.kycDetails.selfieVerification.selfiePath;
        if (selfiePathRelative) {
          const absoluteSelfiePath = path.join(__dirname, '..', selfiePathRelative);
          if (fs.existsSync(absoluteSelfiePath)) {
            fs.unlinkSync(absoluteSelfiePath);
            console.log(`✓ Deleted physical selfie file for User ID: ${user._id}`);
          }
        }

        // Clear selfie details but retain capturedAt log
        user.kycDetails.selfieVerification.selfiePath = null;
        user.kycDetails.selfieVerification.dataRetentionExpiry = null;
        await user.save();
        console.log(`✓ Cleared selfie path reference in database for User ID: ${user._id}`);
      }
    }

    console.log('✓ Regulatory Data Retention Expiry Sweep completed successfully.');
  } catch (error) {
    console.error('❌ Data retention sweep failed:', error.message);
  }
};

/**
 * Setup a simple interval scheduler to run the sweep daily in development/tests
 */
const startRetentionScheduler = (intervalMs = 24 * 60 * 60 * 1000) => {
  // Run once on start
  runRetentionSweep();
  // Schedule recurring
  setInterval(runRetentionSweep, intervalMs);
};

module.exports = {
  runRetentionSweep,
  startRetentionScheduler
};
