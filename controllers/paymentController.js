const Payment = require('../models/Payment');
const UserScheme = require('../models/UserScheme');
const GoldRate = require('../models/GoldRate');
const User = require('../models/User');
const Joi = require('joi');
const crypto = require('crypto');
const helpers = require('../utils/helpers');
const { sendPaymentSuccessWhatsApp, sendPaymentReminderWhatsApp } = require('../utils/whatsappService');

// Input Validation Schemas
const initializeSchema = Joi.object({
  userSchemeId: Joi.string().required(),
  installmentType: Joi.string().valid('CURRENT_MONTH', 'PENDING_DUES', 'ADVANCE_PAYMENT').required(),
  amount: Joi.number().positive().required()
});

const verifySchema = Joi.object({
  transactionId: Joi.string().required(),
  status: Joi.string().valid('SUCCESSFUL', 'FAILED').required(),
  paymentMethod: Joi.string().optional().default('UPI - Google Pay')
});

/**
 * @desc    Get upcoming and pending dues for the user's active schemes
 * @route   GET /api/v1/payments/dues
 * @access  Private
 */
const getDues = async (req, res, next) => {
  try {
    const activeSchemes = await UserScheme.find({ userId: req.user.id, status: 'ACTIVE' }).populate('schemeId');
    
    let totalPendingAmount = 0;
    let nextDueAmount = 0;
    let nextDueDate = null;
    const schemesDuesList = [];

    const now = new Date();

    for (let us of activeSchemes) {
      const monthlyAmt = us.monthlyInvestment;
      const duration = us.schemeId.durationMonths;
      const paidMonths = Math.floor(us.totalPaid / monthlyAmt);

      // Calculate elapsed months since start date
      const start = new Date(us.startDate);
      const diffTime = Math.abs(now - start);
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Approx month length
      
      // Caps elapsed months to maximum scheme duration
      const elapsedMonths = Math.min(diffMonths, duration);

      // Calculate pending dues (arrears)
      const pendingDuesCount = Math.max(0, elapsedMonths - paidMonths);
      const pendingAmount = pendingDuesCount * monthlyAmt;

      // Calculate next due date
      const nextDueIndex = paidMonths; // Index of the next payment
      const nextDue = new Date(us.startDate);
      nextDue.setMonth(nextDue.getMonth() + nextDueIndex);
      nextDue.setDate(5); // Fixed day of the month is 5th

      let isMatured = paidMonths >= duration;
      let nextSchemeDue = isMatured ? 0 : monthlyAmt;

      totalPendingAmount += pendingAmount;
      nextDueAmount += nextSchemeDue;

      if (!isMatured && (!nextDueDate || nextDue < nextDueDate)) {
        nextDueDate = nextDue;
      }

      schemesDuesList.push({
        userSchemeId: us._id,
        schemeName: us.schemeId.name,
        monthlyInvestment: monthlyAmt,
        paidInstallments: paidMonths,
        totalInstallments: duration,
        pendingDuesCount,
        pendingAmount,
        nextDueAmount: nextSchemeDue,
        nextDueDate: isMatured ? null : nextDue.toISOString().split('T')[0],
        status: us.status,
        isMatured
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment dues retrieved successfully',
      errorCode: null,
      data: {
        totalPendingAmount,
        nextDueAmount,
        nextDueDate: nextDueDate ? nextDueDate.toISOString().split('T')[0] : null,
        schemes: schemesDuesList
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initialize a payment (create pending transaction)
 * @route   POST /api/v1/payments/initialize
 * @access  Private
 */
const initializePayment = async (req, res, next) => {
  try {
    const { error } = initializeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { userSchemeId, installmentType, amount } = req.body;

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
        message: 'This gold scheme subscription is no longer active',
        errorCode: 'SCHEME_INACTIVE',
        data: null
      });
    }

    // Verify KYC is approved before taking money
    const user = await User.findById(req.user.id);
    if (user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'KYC approval is required to initiate payments.',
        errorCode: 'KYC_REQUIRED',
        data: null
      });
    }

    // Generate mock Razorpay Order ID
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const razorpayOrderId = `order_${randomSuffix}`;

    // Convenience fee & GST calculations (GST 0% as per screens, but can be updated)
    const convenienceFee = 0;
    const gst = 0;

    const payment = await Payment.create({
      userId: req.user.id,
      userSchemeId,
      amount,
      installmentType,
      razorpayOrderId,
      convenienceFee,
      gst,
      status: 'PENDING'
    });

    return res.status(201).json({
      success: true,
      message: 'Payment initialized successfully',
      errorCode: null,
      data: {
        transactionId: payment._id,
        razorpayOrderId: payment.razorpayOrderId,
        amount: payment.amount,
        gst: payment.gst,
        convenienceFee: payment.convenienceFee,
        totalPayable: payment.amount + payment.gst + payment.convenienceFee,
        schemeName: userScheme.schemeId.name
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify payment and credit gold
 * @route   POST /api/v1/payments/verify
 * @access  Private
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { error } = verifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const { transactionId, status, paymentMethod } = req.body;

    const payment = await Payment.findOne({ _id: transactionId, userId: req.user.id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
        errorCode: 'TRANSACTION_NOT_FOUND',
        data: null
      });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Transaction has already been processed with status: ${payment.status}`,
        errorCode: 'TRANSACTION_ALREADY_PROCESSED',
        data: null
      });
    }

    if (status === 'FAILED') {
      payment.status = 'FAILED';
      await payment.save();

      return res.status(200).json({
        success: false,
        message: 'Payment failed. Please try again.',
        errorCode: 'PAYMENT_FAILED',
        data: {
          transactionId: payment._id,
          status: payment.status
        }
      });
    }

    // Success flow
    payment.status = 'SUCCESSFUL';
    payment.paidAt = new Date();
    payment.paymentMethod = paymentMethod;
    
    // Generate mock transaction ID and Invoice No
    const txnNum = Math.floor(100000000000 + Math.random() * 900000000000);
    payment.transactionId = `TXN${txnNum}`;
    
    const invNum = Math.floor(10000 + Math.random() * 90000);
    const year = new Date().getFullYear();
    payment.invoiceNo = `INV-${year}-${invNum}`;

    await payment.save();

    // Fetch user scheme and update details
    const userScheme = await UserScheme.findById(payment.userSchemeId).populate('schemeId');
    if (!userScheme) {
      return res.status(404).json({
        success: false,
        message: 'Associated user scheme not found',
        errorCode: 'SCHEME_NOT_FOUND',
        data: null
      });
    }

    // Get today's gold rate to compute grams gained
    const latestRate = await GoldRate.findOne().sort({ lastUpdated: -1 });
    const ratePerGram24K = latestRate ? (latestRate.rate24K_per_8g / 8) : 7000;
    
    // Grams accumulated = paid amount / gold rate
    const goldGained = Math.round((payment.amount / ratePerGram24K) * 1000) / 1000; // 3 decimals

    userScheme.goldAccumulated = Math.round((userScheme.goldAccumulated + goldGained) * 1000) / 1000;
    userScheme.totalPaid += payment.amount;
    
    // Save updated UserScheme
    await userScheme.save();

    // Send success notifications
    await helpers.sendMockNotification(
      req.user.id,
      'Gold Purchase Successful',
      `You have purchased ${goldGained} g gold successfully. Current Balance: ${userScheme.goldAccumulated} g.`,
      'GOLD_PURCHASE'
    );

    // Fetch user profile for details
    const user = await User.findById(req.user.id);

    // Send WhatsApp Payment Success Receipt
    if (user) {
      sendPaymentSuccessWhatsApp({
        mobileNumber: user.mobileNumber,
        userName: user.kycDetails?.personalInfo?.fullName || 'Customer',
        schemeName: userScheme.schemeId ? userScheme.schemeId.name : 'Swarna Bindu Scheme',
        amountPaid: payment.amount,
        goldGainedGrams: goldGained,
        totalGoldGrams: userScheme.goldAccumulated,
        invoiceNo: payment.invoiceNo,
        transactionId: payment.transactionId
      }).catch(err => console.error('WhatsApp Error:', err.message));
    }

    return res.status(200).json({
      success: true,
      message: 'Payment processed and gold credited successfully',
      errorCode: null,
      data: {
        payment: {
          transactionId: payment.transactionId,
          invoiceNo: payment.invoiceNo,
          razorpayOrderId: payment.razorpayOrderId,
          amountPaid: payment.amount,
          goldGained,
          paidAt: payment.paidAt,
          paymentMethod: payment.paymentMethod,
          status: payment.status
        },
        userScheme: {
          id: userScheme._id,
          goldAccumulated: userScheme.goldAccumulated,
          totalPaid: userScheme.totalPaid
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's payment transaction history (paginated)
 * @route   GET /api/v1/payments/history
 * @access  Private
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Payment.countDocuments({ userId: req.user.id, status: { $ne: 'PENDING' } });
    const history = await Payment.find({ userId: req.user.id, status: { $ne: 'PENDING' } })
      .populate({
        path: 'userSchemeId',
        populate: { path: 'schemeId' }
      })
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit);

    const formatted = history.map(p => ({
      transactionId: p.transactionId || `PEND-${p._id}`,
      schemeName: p.userSchemeId ? p.userSchemeId.schemeId.name : 'Unknown Scheme',
      amountPaid: p.amount,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt,
      status: p.status,
      installmentType: p.installmentType
    }));

    return res.status(200).json({
      success: true,
      message: 'Payment history retrieved successfully',
      errorCode: null,
      data: {
        history: formatted,
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
 * @desc    Get details of a successful payment receipt
 * @route   GET /api/v1/payments/receipt/:transactionId
 * @access  Private
 */
const getReceipt = async (req, res, next) => {
  try {
    // Search by transactionId string
    const payment = await Payment.findOne({
      transactionId: req.params.transactionId,
      userId: req.user.id,
      status: 'SUCCESSFUL'
    }).populate({
      path: 'userSchemeId',
      populate: { path: 'schemeId' }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found for this transaction ID',
        errorCode: 'RECEIPT_NOT_FOUND',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Receipt retrieved successfully',
      errorCode: null,
      data: {
        receipt: {
          schemeName: payment.userSchemeId.schemeId.name,
          schemeStatus: payment.userSchemeId.status,
          installmentType: payment.installmentType,
          paidAt: payment.paidAt,
          amountPaid: payment.amount,
          gst: payment.gst,
          convenienceFee: payment.convenienceFee,
          totalPaid: payment.amount + payment.gst + payment.convenienceFee,
          transactionId: payment.transactionId,
          invoiceNo: payment.invoiceNo,
          razorpayOrderId: payment.razorpayOrderId,
          paymentMethod: payment.paymentMethod
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDues,
  initializePayment,
  verifyPayment,
  getPaymentHistory,
  getReceipt
};
