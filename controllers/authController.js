const Joi = require('joi');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const helpers = require('../utils/helpers');

// Joi schemas
const sendOtpSchema = Joi.object({
  mobileNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Please provide a valid E.164 mobile number (e.g. +919876543210 or 9876543210)'
  })
});

const verifyOtpSchema = Joi.object({
  mobileNumber: Joi.string().required(),
  otp: Joi.string().length(6).required(),
  deviceToken: Joi.string().optional().allow(null, '')
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

/**
 * @desc    Send OTP to Mobile Number
 * @route   POST /api/v1/auth/send-otp
 * @access  Public
 */
const sendOtp = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;

    // Joi validation check (alternative if middleware not used)
    const { error } = sendOtpSchema.validate({ mobileNumber });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    // Check if user exists or create them
    let user = await User.findOne({ mobileNumber });
    if (!user) {
      user = await User.create({ mobileNumber });
    }

    // Generate mock OTP
    const otp = helpers.generateOTP();
    helpers.saveOTP(mobileNumber, otp);

    // Print OTP in console for testing ease
    console.log(`\n🔑 [MOCK OTP SENT] Mobile: ${mobileNumber} | OTP: ${otp}\n`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your mobile number',
      errorCode: null,
      data: {
        otpSent: true,
        expiresInSeconds: 300 // 5 minutes
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and return JWT tokens
 * @route   POST /api/v1/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { mobileNumber, otp, deviceToken } = req.body;

    const { error } = verifyOtpSchema.validate({ mobileNumber, otp, deviceToken });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    // Verify OTP
    const isValid = helpers.verifyOTP(mobileNumber, otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        errorCode: 'INVALID_OTP',
        data: null
      });
    }

    // Find User
    let user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    // Update verified status and deviceToken if provided
    user.isVerified = true;
    if (deviceToken) {
      user.deviceToken = deviceToken;
    }
    user.lastSyncedAt = new Date();
    await user.save();

    // Generate JWTs
    const accessToken = helpers.generateAccessToken(user._id);
    const refreshToken = helpers.generateRefreshToken(user._id);

    // Save Refresh Token in Database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt
    });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      errorCode: null,
      data: {
        user: {
          id: user._id,
          mobileNumber: user.mobileNumber,
          kycStatus: user.kycStatus
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const { error } = refreshSchema.validate({ refreshToken });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    // Find token in database
    const savedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!savedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        errorCode: 'INVALID_REFRESH_TOKEN',
        data: null
      });
    }

    // Check if expired
    if (new Date() > savedToken.expiresAt) {
      await RefreshToken.deleteOne({ _id: savedToken._id });
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired, please login again',
        errorCode: 'REFRESH_TOKEN_EXPIRED',
        data: null
      });
    }

    // Generate new Access Token
    const accessToken = helpers.generateAccessToken(savedToken.userId);

    return res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
      errorCode: null,
      data: {
        accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout - Invalidate refresh token
 * @route   POST /api/v1/auth/logout
 * @access  Public (unprotected but invalidates a active token)
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const { error } = refreshSchema.validate({ refreshToken });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    await RefreshToken.deleteOne({ token: refreshToken });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      errorCode: null,
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  refresh,
  logout
};
