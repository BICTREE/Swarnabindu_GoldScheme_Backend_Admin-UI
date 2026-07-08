const User = require('../models/User');
const UserScheme = require('../models/UserScheme');
const GoldRate = require('../models/GoldRate');
const Payment = require('../models/Payment');
const Joi = require('joi');
const helpers = require('../utils/helpers');

// Input Validation Schemas
const personalInfoSchema = Joi.object({
  fullName: Joi.string().min(2).required(),
  dob: Joi.date().iso().required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  email: Joi.string().email().required()
});

const identitySchema = Joi.object({
  aadhaarNumber: Joi.string().length(12).pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'Aadhaar number must contain exactly 12 digits'
  }),
  panNumber: Joi.string().length(10).pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).required().messages({
    'string.pattern.base': 'Please provide a valid PAN card number (e.g. ABCDE1234F)'
  }),
  digiLockerConnected: Joi.boolean().optional()
});

const addressSchema = Joi.object({
  houseName: Joi.string().required(),
  street: Joi.string().required(),
  landmark: Joi.string().optional().allow(null, ''),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pinCode: Joi.string().length(6).pattern(/^\d+$/).required(),
  latitude: Joi.number().optional().allow(null),
  longitude: Joi.number().optional().allow(null)
});

const bankSchema = Joi.object({
  accountHolderName: Joi.string().required(),
  bankName: Joi.string().required(),
  accountNumber: Joi.string().min(9).max(18).required(),
  confirmAccountNumber: Joi.string().valid(Joi.ref('accountNumber')).required().messages({
    'any.only': 'Account number and confirmation account number must match'
  }),
  ifscCode: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required().messages({
    'string.pattern.base': 'Please provide a valid Indian bank IFSC code (e.g. UTIB0001234)'
  }),
  branchName: Joi.string().required(),
  upiId: Joi.string().optional().allow(null, '')
});

/**
 * @desc    Get user profile and aggregated investment details
 * @route   GET /api/v1/user/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
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

    // Get today's gold rate
    const latestRate = await GoldRate.findOne().sort({ lastUpdated: -1 });
    const ratePerGram24K = latestRate ? (latestRate.rate24K_per_8g / 8) : 7000; // Fallback to ₹7000 per g

    // Fetch user schemes
    const activeSchemes = await UserScheme.find({ userId: user._id, status: 'ACTIVE' }).populate('schemeId');
    const redeemedSchemes = await UserScheme.find({ userId: user._id, status: 'REDEEMED' }).populate('schemeId');

    // Aggregate savings values
    let totalSavingsValue = 0;
    let totalGoldAccumulated = 0;
    let nextInstallmentDue = 0;
    let goalGoldGram = 0;
    let nextDueDate = null;

    activeSchemes.forEach(us => {
      totalSavingsValue += us.totalPaid;
      totalGoldAccumulated += us.goldAccumulated;
      nextInstallmentDue += us.monthlyInvestment;
      goalGoldGram += us.goalGoldGram;
      
      // Compute next due date (e.g. 5th of next month)
      const date = new Date(us.startDate);
      // Simple logic: due date = start date + elapsed installments + 1 month
      const elapsedInstallments = Math.floor(us.totalPaid / us.monthlyInvestment);
      date.setMonth(date.getMonth() + elapsedInstallments);
      date.setDate(5); // schemes due date is 5th
      if (!nextDueDate || date < nextDueDate) {
        nextDueDate = date;
      }
    });

    const currentGoldValue = Math.round(totalGoldAccumulated * ratePerGram24K * 100) / 100;
    const progressPercent = goalGoldGram > 0 ? Math.round((totalGoldAccumulated / goalGoldGram) * 100) : 0;

    return res.status(200).json({
      success: true,
      message: 'Profile data retrieved successfully',
      errorCode: null,
      data: {
        profile: {
          id: user._id,
          mobileNumber: user.mobileNumber,
          kycStatus: user.kycStatus,
          personalInfo: user.kycDetails.personalInfo,
          bankDetails: {
            accountHolderName: user.kycDetails.bankDetails.accountHolderName,
            bankName: user.kycDetails.bankDetails.bankName,
            branchName: user.kycDetails.bankDetails.branchName,
            upiId: user.kycDetails.bankDetails.upiId
          }
        },
        investments: {
          totalSavingsValue, // Total principal paid
          currentGoldValue, // current value based on live gold rate
          totalGoldAccumulated, // in grams
          goalGoldGram, // target gold in grams
          progressPercent, // e.g. 73%
          nextInstallmentDue,
          nextDueDate: nextDueDate ? nextDueDate.toISOString().split('T')[0] : null,
          activeSchemesCount: activeSchemes.length,
          redeemedSchemesCount: redeemedSchemes.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit KYC Step 1 (Personal Info & Profile Picture)
 * @route   PUT /api/v1/user/kyc/personal
 * @access  Private
 */
const updatePersonalKyc = async (req, res, next) => {
  try {
    const { fullName, dob, gender, email } = req.body;

    const { error } = personalInfoSchema.validate({ fullName, dob, gender, email });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const user = await User.findById(req.user.id);
    
    // Save details
    user.kycDetails.personalInfo.fullName = fullName;
    user.kycDetails.personalInfo.dob = new Date(dob);
    user.kycDetails.personalInfo.gender = gender;
    user.kycDetails.personalInfo.email = email;

    // Handle file upload
    if (req.file) {
      user.kycDetails.personalInfo.profilePicture = `/uploads/profiles/${req.file.filename}`;
    }

    user.lastSyncedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'KYC Step 1: Personal details updated successfully',
      errorCode: null,
      data: {
        kycStatus: user.kycStatus,
        personalInfo: user.kycDetails.personalInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit KYC Step 2 (Identity Verification)
 * @route   PUT /api/v1/user/kyc/identity
 * @access  Private
 */
const updateIdentityKyc = async (req, res, next) => {
  try {
    const { aadhaarNumber, panNumber, digiLockerConnected } = req.body;

    const { error } = identitySchema.validate({
      aadhaarNumber,
      panNumber,
      digiLockerConnected: digiLockerConnected === 'true' || digiLockerConnected === true
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const user = await User.findById(req.user.id);

    user.kycDetails.identityVerification.aadhaarNumber = aadhaarNumber;
    user.kycDetails.identityVerification.panNumber = panNumber;
    user.kycDetails.identityVerification.digiLockerConnected = digiLockerConnected === 'true' || digiLockerConnected === true;

    // Handle file uploads (aadhaarFront, aadhaarBack, panCardPhoto)
    if (req.files) {
      if (req.files.aadhaarFront) {
        user.kycDetails.identityVerification.aadhaarFront = `/uploads/kyc/${req.files.aadhaarFront[0].filename}`;
      }
      if (req.files.aadhaarBack) {
        user.kycDetails.identityVerification.aadhaarBack = `/uploads/kyc/${req.files.aadhaarBack[0].filename}`;
      }
      if (req.files.panCardPhoto) {
        user.kycDetails.identityVerification.panCardPhoto = `/uploads/kyc/${req.files.panCardPhoto[0].filename}`;
      }
    }

    user.lastSyncedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'KYC Step 2: Identity documents updated successfully',
      errorCode: null,
      data: {
        kycStatus: user.kycStatus,
        identityVerification: {
          aadhaarNumber: user.kycDetails.identityVerification.aadhaarNumber,
          panNumber: user.kycDetails.identityVerification.panNumber,
          digiLockerConnected: user.kycDetails.identityVerification.digiLockerConnected,
          aadhaarFront: user.kycDetails.identityVerification.aadhaarFront,
          aadhaarBack: user.kycDetails.identityVerification.aadhaarBack,
          panCardPhoto: user.kycDetails.identityVerification.panCardPhoto
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit KYC Step 3 (Address Information)
 * @route   PUT /api/v1/user/kyc/address
 * @access  Private
 */
const updateAddressKyc = async (req, res, next) => {
  try {
    const { houseName, street, landmark, city, state, pinCode, latitude, longitude } = req.body;

    const { error } = addressSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const user = await User.findById(req.user.id);

    user.kycDetails.addressInfo.houseName = houseName;
    user.kycDetails.addressInfo.street = street;
    user.kycDetails.addressInfo.landmark = landmark || null;
    user.kycDetails.addressInfo.city = city;
    user.kycDetails.addressInfo.state = state;
    user.kycDetails.addressInfo.pinCode = pinCode;

    if (latitude !== undefined && longitude !== undefined) {
      user.kycDetails.addressInfo.locationCoordinates = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    user.lastSyncedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'KYC Step 3: Address information updated successfully',
      errorCode: null,
      data: {
        kycStatus: user.kycStatus,
        addressInfo: user.kycDetails.addressInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit KYC Step 4 (Bank Details)
 * @route   PUT /api/v1/user/kyc/bank
 * @access  Private
 */
const updateBankKyc = async (req, res, next) => {
  try {
    const { error } = bankSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { accountHolderName, bankName, accountNumber, ifscCode, branchName, upiId } = req.body;

    const user = await User.findById(req.user.id);

    user.kycDetails.bankDetails.accountHolderName = accountHolderName;
    user.kycDetails.bankDetails.bankName = bankName;
    user.kycDetails.bankDetails.accountNumber = accountNumber;
    user.kycDetails.bankDetails.ifscCode = ifscCode;
    user.kycDetails.bankDetails.branchName = branchName;
    user.kycDetails.bankDetails.upiId = upiId || null;

    user.lastSyncedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'KYC Step 4: Bank account details updated successfully',
      errorCode: null,
      data: {
        kycStatus: user.kycStatus,
        bankDetails: user.kycDetails.bankDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit KYC Step 5 (Upload Selfie & Request Submission)
 * @route   POST /api/v1/user/kyc/submit
 * @access  Private
 */
const submitKyc = async (req, res, next) => {
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

    // Verify file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Selfie capture is required to submit KYC',
        errorCode: 'SELFIE_REQUIRED',
        data: null
      });
    }

    // Check if previous sections are filled
    const pInfo = user.kycDetails.personalInfo;
    const iInfo = user.kycDetails.identityVerification;
    const aInfo = user.kycDetails.addressInfo;
    const bInfo = user.kycDetails.bankDetails;

    if (!pInfo.fullName || !iInfo.aadhaarNumber || !aInfo.houseName || !bInfo.accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all previous KYC steps (1-4) before submitting',
        errorCode: 'INCOMPLETE_KYC_STEPS',
        data: null
      });
    }

    // Set Selfie fields
    user.kycDetails.selfieVerification.selfiePath = `/uploads/selfies/${req.file.filename}`;
    user.kycDetails.selfieVerification.capturedAt = new Date();

    // Lock status and submit
    user.kycStatus = 'SUBMITTED';
    user.lastSyncedAt = new Date();
    await user.save();

    // Generate mock verification status: Auto-approves after 5 seconds of delay or immediately for simulation.
    // Here we will automatically approve KYC for development ease, but notify via helper
    await helpers.sendMockNotification(
      user._id,
      'KYC Details Received',
      'Your KYC has been submitted successfully and is currently under review.',
      'KYC_STATUS'
    );

    // Simulated auto-approval: trigger database update after brief interval, or let the mock run immediately.
    // For local developer sandbox ease, we will set up a setTimeout to approve KYC in 10 seconds.
    setTimeout(async () => {
      try {
        const checkUser = await User.findById(user._id);
        if (checkUser && checkUser.kycStatus === 'SUBMITTED') {
          checkUser.kycStatus = 'APPROVED';
          await checkUser.save();
          await helpers.sendMockNotification(
            checkUser._id,
            'KYC Approved Successfully!',
            'Congratulations, your KYC has been verified. You can now subscribe to any gold scheme.',
            'KYC_STATUS'
          );
          console.log(`🚀 [KYC AUTO-APPROVED] User: ${checkUser.mobileNumber}`);
        }
      } catch (err) {
        console.error(`Auto-approval failed: ${err.message}`);
      }
    }, 10000);

    return res.status(200).json({
      success: true,
      message: 'KYC documents submitted successfully. Status set to SUBMITTED.',
      errorCode: null,
      data: {
        kycStatus: user.kycStatus,
        selfieDetails: user.kycDetails.selfieVerification
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get KYC Status
 * @route   GET /api/v1/user/kyc/status
 * @access  Private
 */
const getKycStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'KYC status retrieved',
      errorCode: null,
      data: {
        kycStatus: user.kycStatus,
        rejectedReason: user.kycDetails.rejectedReason
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updatePersonalKyc,
  updateIdentityKyc,
  updateAddressKyc,
  updateBankKyc,
  submitKyc,
  getKycStatus
};
