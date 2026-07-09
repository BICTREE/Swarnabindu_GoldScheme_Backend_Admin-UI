const Payment = require('../../models/Payment');
const UserScheme = require('../../models/UserScheme');
const GoldRate = require('../../models/GoldRate');
const helpers = require('../../utils/helpers');

/**
 * @desc    Get all payments across the platform (paginated + filters)
 * @route   GET /api/v1/admin/payments
 * @access  Private (Super Admin, Moderator, Support)
 */
const getPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.userId) {
      query.userId = req.query.userId;
    }
    if (req.query.installmentType) {
      query.installmentType = req.query.installmentType;
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('userId', 'mobileNumber kycDetails.personalInfo.fullName')
      .populate({
        path: 'userSchemeId',
        populate: { path: 'schemeId' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Payments transactions retrieved successfully',
      errorCode: null,
      data: {
        payments,
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
 * @desc    Manually reconcile a pending/failed payment to successful (reconciling banking drops)
 * @route   POST /api/v1/admin/payments/:id/reconcile
 * @access  Private (Super Admin only)
 */
const reconcilePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
        errorCode: 'PAYMENT_NOT_FOUND',
        data: null
      });
    }

    if (payment.status === 'SUCCESSFUL') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already successful and reconciled',
        errorCode: 'ALREADY_RECONCILED',
        data: null
      });
    }

    const oldStatus = payment.status;

    // Transition to SUCCESSFUL
    payment.status = 'SUCCESSFUL';
    payment.paidAt = new Date();
    payment.paymentMethod = 'Offline Reconciled';

    // Generate Invoice and Txn Reference if not present
    if (!payment.transactionId) {
      const txnNum = Math.floor(100000000000 + Math.random() * 900000000000);
      payment.transactionId = `TXN${txnNum}`;
    }
    if (!payment.invoiceNo) {
      const invNum = Math.floor(10000 + Math.random() * 90000);
      const year = new Date().getFullYear();
      payment.invoiceNo = `INV-${year}-${invNum}`;
    }

    await payment.save();

    // Fetch corresponding UserScheme
    const userScheme = await UserScheme.findById(payment.userSchemeId);
    if (!userScheme) {
      return res.status(404).json({
        success: false,
        message: 'Associated user scheme subscription not found',
        errorCode: 'SCHEME_NOT_FOUND',
        data: null
      });
    }

    // Get live gold rate to credit gold weight
    const latestRate = await GoldRate.findOne().sort({ lastUpdated: -1 });
    const ratePerGram24K = latestRate ? (latestRate.rate24K_per_8g / 8) : 7000;

    const goldGained = Math.round((payment.amount / ratePerGram24K) * 1000) / 1000;

    userScheme.goldAccumulated = Math.round((userScheme.goldAccumulated + goldGained) * 1000) / 1000;
    userScheme.totalPaid += payment.amount;
    await userScheme.save();

    // Log admin action to audit logs
    await helpers.logAdminAction(
      req.admin._id,
      'RECONCILE_PAYMENT',
      'Payment',
      payment._id,
      {
        oldStatus,
        newStatus: payment.status,
        amount: payment.amount,
        goldGained,
        invoiceNo: payment.invoiceNo
      },
      req
    );

    // Send notifications to client
    await helpers.sendMockNotification(
      payment.userId,
      'Payment Reconciled successfully',
      `Your payment of ₹${payment.amount} has been reconciled manually. ${goldGained} g gold has been credited to your scheme.`,
      'GOLD_PURCHASE'
    );

    return res.status(200).json({
      success: true,
      message: 'Payment manually reconciled and gold credited successfully',
      errorCode: null,
      data: {
        payment,
        userScheme: {
          id: userScheme._id,
          goldAccumulated: userScheme.goldAccumulated,
          totalPaid: userScheme.totalPaid
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPayments,
  reconcilePayment
};
