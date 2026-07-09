const Scheme = require('../models/Scheme');
const UserScheme = require('../models/UserScheme');
const User = require('../models/User');
const GoldRate = require('../models/GoldRate');
const helpers = require('../utils/helpers');

/**
 * @desc    Get all available schemes (paginated)
 * @route   GET /api/v1/schemes
 * @access  Private
 */
const getSchemes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Scheme.countDocuments({ isActive: true });
    const schemes = await Scheme.find({ isActive: true })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Schemes catalog retrieved successfully',
      errorCode: null,
      data: {
        schemes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details of a single scheme
 * @route   GET /api/v1/schemes/:id
 * @access  Private
 */
const getSchemeById = async (req, res, next) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme || !scheme.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found or inactive',
        errorCode: 'SCHEME_NOT_FOUND',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Scheme details retrieved successfully',
      errorCode: null,
      data: { scheme }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join a scheme (subscribe)
 * @route   POST /api/v1/schemes/:id/join
 * @access  Private
 */
const joinScheme = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    // Require KYC approval
    if (user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'KYC approval is required to subscribe to gold schemes. Please complete your profile KYC.',
        errorCode: 'KYC_REQUIRED',
        data: { kycStatus: user.kycStatus }
      });
    }

    const scheme = await Scheme.findById(req.params.id);
    if (!scheme || !scheme.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found',
        errorCode: 'SCHEME_NOT_FOUND',
        data: null
      });
    }

    // Check if user already has an active subscription to this scheme
    const existingActive = await UserScheme.findOne({
      userId: user._id,
      schemeId: scheme._id,
      status: 'ACTIVE'
    });
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription to this scheme.',
        errorCode: 'DUPLICATE_SUBSCRIPTION',
        data: null
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(startDate.getMonth() + scheme.durationMonths);

    // Get today's gold rate to compute goal target weight
    const latestRate = await GoldRate.findOne().sort({ lastUpdated: -1 });
    const ratePerGram24K = latestRate ? (latestRate.rate24K_per_8g / 8) : 7000;
    
    // Goal Gold target = Total planned investment / current gold rate per gram
    const totalPlannedInvestment = scheme.monthlyInvestment * scheme.durationMonths;
    const goalGoldGram = Math.round((totalPlannedInvestment / ratePerGram24K) * 1000) / 1000; // 3 decimals

    const userScheme = await UserScheme.create({
      userId: user._id,
      schemeId: scheme._id,
      monthlyInvestment: scheme.monthlyInvestment,
      startDate,
      endDate,
      goalGoldGram,
      status: 'ACTIVE'
    });

    // Notify user
    await helpers.sendMockNotification(
      user._id,
      'Joined Scheme Successfully',
      `Welcome to ${scheme.name}! Your monthly savings target is ₹${scheme.monthlyInvestment}.`,
      'GOLD_PURCHASE'
    );

    return res.status(201).json({
      success: true,
      message: 'Subscribed to scheme successfully',
      errorCode: null,
      data: {
        userScheme: {
          id: userScheme._id,
          schemeName: scheme.name,
          monthlyInvestment: userScheme.monthlyInvestment,
          startDate: userScheme.startDate.toISOString().split('T')[0],
          endDate: userScheme.endDate.toISOString().split('T')[0],
          goalGoldGram: userScheme.goalGoldGram,
          status: userScheme.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's subscribed schemes
 * @route   GET /api/v1/schemes/my-schemes
 * @access  Private
 */
const getMySchemes = async (req, res, next) => {
  try {
    const userSchemes = await UserScheme.find({ userId: req.user.id })
      .populate('schemeId')
      .sort({ createdAt: -1 });

    const formatted = userSchemes.map(us => ({
      id: us._id,
      schemeName: us.schemeId.name,
      monthlyInvestment: us.monthlyInvestment,
      goldAccumulated: us.goldAccumulated,
      totalPaid: us.totalPaid,
      status: us.status,
      startDate: us.startDate.toISOString().split('T')[0],
      endDate: us.endDate.toISOString().split('T')[0],
      goalGoldGram: us.goalGoldGram,
      redeemedAt: us.redeemedAt,
      redeemedGoldGram: us.redeemedGoldGram,
      redeemedValue: us.redeemedValue,
      progressPercent: us.goalGoldGram > 0 ? Math.round((us.goldAccumulated / us.goalGoldGram) * 100) : 0
    }));

    return res.status(200).json({
      success: true,
      message: 'My schemes retrieved successfully',
      errorCode: null,
      data: { schemes: formatted }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSchemes,
  getSchemeById,
  joinScheme,
  getMySchemes
};
