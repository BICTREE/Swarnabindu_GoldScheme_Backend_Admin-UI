const GoldRate = require('../models/GoldRate');
const UserScheme = require('../models/UserScheme');
const User = require('../models/User');
const Joi = require('joi');
const helpers = require('../utils/helpers');

// Input Validation Schemas
const redeemSchema = Joi.object({
  userSchemeId: Joi.string().required(),
  goldQuantity: Joi.number().positive().max(1000).optional()
});

/**
 * @desc    Get today's gold rate
 * @route   GET /api/v1/gold-rate/today
 * @access  Public
 */
const getTodayRate = async (req, res, next) => {
  try {
    // Dynamically fluctuate gold rate slightly before returning, so it feels alive
    await helpers.fluctuateGoldRates();

    const latestRate = await GoldRate.findOne().sort({ lastUpdated: -1 });
    if (!latestRate) {
      return res.status(404).json({
        success: false,
        message: 'Gold rate not found. Please seed gold rates first.',
        errorCode: 'RATE_NOT_FOUND',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Today\'s gold rate retrieved successfully',
      errorCode: null,
      data: {
        rate22K_per_g: latestRate.rate22K_per_g,
        rate24K_per_8g: latestRate.rate24K_per_8g,
        lastUpdated: latestRate.lastUpdated
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Redeem accumulated gold from subscription
 * @route   POST /api/v1/gold/redeem
 * @access  Private
 */
const redeemGold = async (req, res, next) => {
  try {
    const { error } = redeemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { userSchemeId, goldQuantity } = req.body;

    const userScheme = await UserScheme.findOne({ _id: userSchemeId, userId: req.user.id }).populate('schemeId');
    if (!userScheme) {
      return res.status(404).json({
        success: false,
        message: 'Active gold scheme subscription not found',
        errorCode: 'SCHEME_NOT_FOUND',
        data: null
      });
    }

    if (userScheme.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Gold scheme subscription is already in ${userScheme.status} status`,
        errorCode: 'SCHEME_INACTIVE',
        data: null
      });
    }

    // Verify KYC is approved before allowing redemption
    const user = await User.findById(req.user.id);
    if (user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'KYC approval is required to redeem gold.',
        errorCode: 'KYC_REQUIRED',
        data: null
      });
    }

    // Determine redemption quantity
    const totalAccumulated = userScheme.goldAccumulated;
    const redeemAmount = goldQuantity !== undefined ? goldQuantity : totalAccumulated;

    if (totalAccumulated <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No gold accumulated in this scheme to redeem',
        errorCode: 'NO_GOLD_ACCUMULATED',
        data: null
      });
    }

    if (redeemAmount > totalAccumulated) {
      return res.status(400).json({
        success: false,
        message: `Insufficient gold balance. You requested to redeem ${redeemAmount} g but only have ${totalAccumulated} g.`,
        errorCode: 'INSUFFICIENT_GOLD_BALANCE',
        data: null
      });
    }

    // Get today's gold rate to compute value
    const latestRate = await GoldRate.findOne().sort({ lastUpdated: -1 });
    const ratePerGram24K = latestRate ? (latestRate.rate24K_per_8g / 8) : 7000;

    const cashValue = Math.round(redeemAmount * ratePerGram24K * 100) / 100;

    // Update UserScheme
    userScheme.goldAccumulated = Math.round((userScheme.goldAccumulated - redeemAmount) * 1000) / 1000;
    
    // If they redeemed everything or left with 0, change status to REDEEMED
    if (userScheme.goldAccumulated <= 0) {
      userScheme.status = 'REDEEMED';
      userScheme.redeemedAt = new Date();
      userScheme.redeemedGoldGram = redeemAmount;
      userScheme.redeemedValue = cashValue;
    }

    await userScheme.save();

    // Log Notification
    await helpers.sendMockNotification(
      req.user.id,
      'Gold Redemption Successful',
      `Your redemption request of ${redeemAmount} g gold has been confirmed. You will receive ₹${cashValue.toLocaleString()} in your bank account shortly.`,
      'GOLD_REDEMPTION'
    );

    return res.status(200).json({
      success: true,
      message: 'Gold redeemed successfully',
      errorCode: null,
      data: {
        redemption: {
          userSchemeId: userScheme._id,
          schemeName: userScheme.schemeId.name,
          redeemedGrams: redeemAmount,
          goldRateApplied: ratePerGram24K,
          payoutAmount: cashValue,
          payoutBankAccount: {
            bankName: user.kycDetails.bankDetails.bankName,
            accountNumber: user.kycDetails.bankDetails.accountNumber ? `XXXX${user.kycDetails.bankDetails.accountNumber.slice(-4)}` : 'N/A'
          },
          status: userScheme.status,
          remainingGoldGrams: userScheme.goldAccumulated
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodayRate,
  redeemGold
};
