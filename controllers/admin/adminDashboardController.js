const User = require('../../models/User');
const Scheme = require('../../models/Scheme');
const UserScheme = require('../../models/UserScheme');
const Payment = require('../../models/Payment');
const GoldRate = require('../../models/GoldRate');
const AuditLog = require('../../models/AuditLog');

/**
 * @desc    Get aggregated platform statistics and financial metrics
 * @route   GET /api/v1/admin/dashboard/stats
 * @access  Private (Super Admin, Moderator, Support)
 */
const getStats = async (req, res, next) => {
  try {
    // 1. User metrics
    const totalUsers = await User.countDocuments();
    const kycApproved = await User.countDocuments({ kycStatus: 'APPROVED' });
    const kycSubmitted = await User.countDocuments({ kycStatus: 'SUBMITTED' });
    const kycRejected = await User.countDocuments({ kycStatus: 'REJECTED' });
    const kycPending = await User.countDocuments({ kycStatus: 'PENDING' });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // 2. Schemes & Subscriptions metrics
    const schemesCount = await Scheme.countDocuments();
    const activeSubscriptions = await UserScheme.countDocuments({ status: 'ACTIVE' });
    const redeemedSubscriptions = await UserScheme.countDocuments({ status: 'REDEEMED' });

    // 3. Financial metrics
    const paymentsAgg = await Payment.aggregate([
      { $match: { status: 'SUCCESSFUL' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const totalRevenue = paymentsAgg.length > 0 ? paymentsAgg[0].totalRevenue : 0;

    const goldAgg = await UserScheme.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: null, totalGoldAccumulated: { $sum: '$goldAccumulated' } } }
    ]);
    const totalGoldAccumulated = goldAgg.length > 0 ? goldAgg[0].totalGoldAccumulated : 0;

    // Get today's rate to value the gold liability
    const latestRate = await GoldRate.findOne().sort({ lastUpdated: -1 });
    const ratePerGram24K = latestRate ? (latestRate.rate24K_per_8g / 8) : 7000;
    const goldLiabilityValue = Math.round(totalGoldAccumulated * ratePerGram24K * 100) / 100;

    return res.status(200).json({
      success: true,
      message: 'Dashboard analytics compiled successfully',
      errorCode: null,
      data: {
        users: {
          total: totalUsers,
          banned: bannedUsers,
          kyc: {
            approved: kycApproved,
            submitted: kycSubmitted,
            rejected: kycRejected,
            pending: kycPending
          }
        },
        schemes: {
          catalogTemplates: schemesCount,
          activeSubscriptions,
          redeemedSubscriptions
        },
        financials: {
          totalRevenueReceived: totalRevenue, // Total cash collection
          totalGoldReserveLiabilities: totalGoldAccumulated, // in grams
          currentGoldLiabilityValue: goldLiabilityValue, // cash value of gold liability
          goldRateApplied: ratePerGram24K
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get administrative audit logs (SUPER_ADMIN only)
 * @route   GET /api/v1/admin/audit-logs
 * @access  Private (Super Admin only)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.action) {
      query.action = req.query.action;
    }
    if (req.query.adminId) {
      query.adminId = req.query.adminId;
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('adminId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      errorCode: null,
      data: {
        logs,
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

module.exports = {
  getStats,
  getAuditLogs
};
