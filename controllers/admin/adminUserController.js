const User = require('../../models/User');
const Joi = require('joi');
const helpers = require('../../utils/helpers');

// Input Validation Schemas
const banSchema = Joi.object({
  isBanned: Joi.boolean().required()
});

const rejectKycSchema = Joi.object({
  reason: Joi.string().min(5).required()
});

/**
 * @desc    Get all users (paginated + filters)
 * @route   GET /api/v1/admin/users
 * @access  Private (Super Admin, Moderator, Support)
 */
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Filters
    if (req.query.kycStatus) {
      query.kycStatus = req.query.kycStatus;
    }
    if (req.query.isBanned !== undefined) {
      query.isBanned = req.query.isBanned === 'true';
    }

    // Search by mobile number or name
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { mobileNumber: searchRegex },
        { 'kycDetails.personalInfo.fullName': searchRegex },
        { 'kycDetails.personalInfo.email': searchRegex }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Users list retrieved successfully',
      errorCode: null,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get detailed user profile by ID
 * @route   GET /api/v1/admin/users/:id
 * @access  Private (Super Admin, Moderator, Support)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User details retrieved successfully',
      errorCode: null,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Ban / Unban user
 * @route   PUT /api/v1/admin/users/:id/ban
 * @access  Private (Super Admin, Moderator)
 */
const banUser = async (req, res, next) => {
  try {
    const { error } = banSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { isBanned } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    if (user.isBanned === isBanned) {
      return res.status(400).json({
        success: false,
        message: `User is already ${isBanned ? 'banned' : 'active'}`,
        errorCode: 'NO_STATE_CHANGE',
        data: null
      });
    }

    user.isBanned = isBanned;
    user.lastSyncedAt = new Date();
    await user.save();

    // Audit Log
    const action = isBanned ? 'BAN_USER' : 'UNBAN_USER';
    await helpers.logAdminAction(
      req.admin._id,
      action,
      'User',
      user._id,
      { mobileNumber: user.mobileNumber },
      req
    );

    return res.status(200).json({
      success: true,
      message: `User account has been successfully ${isBanned ? 'banned' : 'unbanned'}`,
      errorCode: null,
      data: {
        userId: user._id,
        isBanned: user.isBanned
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all users with KYC status SUBMITTED
 * @route   GET /api/v1/admin/kyc/pending
 * @access  Private (Super Admin, Moderator, Support)
 */
const getPendingKyc = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments({ kycStatus: 'SUBMITTED' });
    const pendingList = await User.find({ kycStatus: 'SUBMITTED' })
      .select('mobileNumber kycStatus kycDetails.personalInfo createdAt')
      .sort({ updatedAt: 1 }) // First submitted, first reviewed
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Pending KYC review requests retrieved',
      errorCode: null,
      data: {
        pendingList,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Approve KYC
 * @route   POST /api/v1/admin/kyc/:id/approve
 * @access  Private (Super Admin, Moderator)
 */
const approveKyc = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    if (user.kycStatus === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'KYC is already approved',
        errorCode: 'ALREADY_APPROVED',
        data: null
      });
    }

    user.kycStatus = 'APPROVED';
    user.kycDetails.rejectedReason = null;
    user.kycDetails.moderatedBy = req.admin._id;
    user.kycDetails.moderatedAt = new Date();
    user.lastSyncedAt = new Date();
    await user.save();

    // Audit Log
    await helpers.logAdminAction(
      req.admin._id,
      'APPROVE_KYC',
      'User',
      user._id,
      { mobileNumber: user.mobileNumber },
      req
    );

    // Send push notification alert
    await helpers.sendMockNotification(
      user._id,
      'KYC Approved Successfully!',
      'Congratulations, your KYC has been verified. You can now subscribe to any gold scheme.',
      'KYC_STATUS'
    );

    return res.status(200).json({
      success: true,
      message: 'KYC request approved successfully',
      errorCode: null,
      data: {
        userId: user._id,
        kycStatus: user.kycStatus
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reject KYC
 * @route   POST /api/v1/admin/kyc/:id/reject
 * @access  Private (Super Admin, Moderator)
 */
const rejectKyc = async (req, res, next) => {
  try {
    const { error } = rejectKycSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    if (user.kycStatus === 'REJECTED' && user.kycDetails.rejectedReason === reason) {
      return res.status(400).json({
        success: false,
        message: 'KYC is already rejected with this reason',
        errorCode: 'ALREADY_REJECTED',
        data: null
      });
    }

    user.kycStatus = 'REJECTED';
    user.kycDetails.rejectedReason = reason;
    user.kycDetails.moderatedBy = req.admin._id;
    user.kycDetails.moderatedAt = new Date();
    user.lastSyncedAt = new Date();
    await user.save();

    // Audit Log
    await helpers.logAdminAction(
      req.admin._id,
      'REJECT_KYC',
      'User',
      user._id,
      { mobileNumber: user.mobileNumber, reason },
      req
    );

    // Send push notification alert
    await helpers.sendMockNotification(
      user._id,
      'KYC Document Verification Failed',
      `Your documents didn't pass verification: ${reason}. Please re-upload clear photos and try again.`,
      'KYC_STATUS'
    );

    return res.status(200).json({
      success: true,
      message: 'KYC request rejected successfully',
      errorCode: null,
      data: {
        userId: user._id,
        kycStatus: user.kycStatus,
        rejectedReason: user.kycDetails.rejectedReason
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  banUser,
  getPendingKyc,
  approveKyc,
  rejectKyc
};
