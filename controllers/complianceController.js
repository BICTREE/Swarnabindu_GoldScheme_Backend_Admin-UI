const Consent = require('../models/Consent');
const User = require('../models/User');
const UserScheme = require('../models/UserScheme');
const Payment = require('../models/Payment');
const GrievanceTicket = require('../models/GrievanceTicket');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

/**
 * @desc    Get user consents list
 * @route   GET /api/v1/compliance/consent
 * @access  Private
 */
const getConsents = async (req, res, next) => {
  try {
    const consents = await Consent.find({ userId: req.user._id });
    return res.status(200).json({
      success: true,
      message: 'Active consents retrieved',
      errorCode: null,
      data: { consents }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log a new consent agreement
 * @route   POST /api/v1/compliance/consent
 * @access  Private
 */
const logConsent = async (req, res, next) => {
  try {
    const { consentType, purpose, consentText } = req.body;
    if (!consentType || !purpose || !consentText) {
      return res.status(400).json({
        success: false,
        message: 'consentType, purpose, and consentText are required',
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    // Deactivate previous active consent of the same type if exists
    await Consent.updateMany(
      { userId: req.user._id, consentType, isWithdrawn: false },
      { isWithdrawn: true, withdrawnAt: new Date() }
    );

    const consent = await Consent.create({
      userId: req.user._id,
      consentType,
      purpose,
      consentText,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      message: 'Consent agreement logged successfully',
      errorCode: null,
      data: { consent }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Withdraw consent
 * @route   DELETE /api/v1/compliance/consent/:type
 * @access  Private
 */
const withdrawConsent = async (req, res, next) => {
  try {
    const { type } = req.params;
    const consents = await Consent.find({ userId: req.user._id, consentType: type, isWithdrawn: false });

    if (consents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active consent of this type found to withdraw',
        errorCode: 'CONSENT_NOT_FOUND',
        data: null
      });
    }

    await Consent.updateMany(
      { userId: req.user._id, consentType: type, isWithdrawn: false },
      { isWithdrawn: true, withdrawnAt: new Date() }
    );

    // Log the withdrawal in the audit ledger
    await AuditLog.create({
      userId: req.user._id,
      action: 'WITHDRAW_CONSENT',
      targetEntity: 'Consent',
      targetId: consents[0]._id,
      details: { consentType: type },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      message: `Consent type ${type} successfully withdrawn.`,
      errorCode: null,
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export personal data (Data Portability right)
 * @route   GET /api/v1/compliance/data-portability
 * @access  Private
 */
const exportData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const consents = await Consent.find({ userId: req.user._id });
    const userSchemes = await UserScheme.find({ userId: req.user._id }).populate('schemeId');
    const payments = await Payment.find({ userId: req.user._id });
    const grievances = await GrievanceTicket.find({ userId: req.user._id });

    // Compile profile
    const profileData = {
      mobileNumber: user.mobileNumber,
      kycStatus: user.kycStatus,
      isBanned: user.isBanned,
      personalInfo: user.kycDetails?.personalInfo || null,
      identityInfo: {
        aadhaarLast4: user.kycDetails?.identityVerification?.aadhaarLast4 || null,
        panNumber: user.kycDetails?.identityVerification?.panNumber ? 'MASKED' : null,
        digiLockerConnected: user.kycDetails?.identityVerification?.digiLockerConnected || false
      },
      addressInfo: user.kycDetails?.addressInfo || null,
      bankDetails: {
        accountHolderName: user.kycDetails?.bankDetails?.accountHolderName || null,
        bankName: user.kycDetails?.bankDetails?.bankName || null,
        accountLast4: user.kycDetails?.bankDetails?.accountLast4 || null,
        ifscCode: user.kycDetails?.bankDetails?.ifscCode || null,
        branchName: user.kycDetails?.bankDetails?.branchName || null
      }
    };

    const portablePayload = {
      exportTimestamp: new Date(),
      fiduciaryName: 'Swarna Bindu Gold Savings Scheme',
      profile: profileData,
      consents,
      subscriptions: userSchemes,
      paymentHistory: payments,
      grievanceTickets: grievances
    };

    // Log the portability access request
    await AuditLog.create({
      userId: req.user._id,
      action: 'DATA_ACCESS_REQUEST',
      targetEntity: 'User',
      targetId: req.user._id,
      details: { exportTime: new Date() },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.setHeader('Content-disposition', `attachment; filename=swarnabindu_data_export_${user.mobileNumber}.json`);
    res.setHeader('Content-type', 'application/json');
    return res.status(200).send(JSON.stringify(portablePayload, null, 2));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Right to Erasure (Anonymization under PMLA retention rules)
 * @route   POST /api/v1/compliance/data-erasure
 * @access  Private
 */
const requestErasure = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // 1. Verify active scheme commitments
    const activeSub = await UserScheme.findOne({ userId: req.user._id, status: 'ACTIVE' });
    if (activeSub) {
      return res.status(400).json({
        success: false,
        message: 'Your account cannot be erased while you have an active gold scheme subscription. Please redeem or close your active schemes first.',
        errorCode: 'ACTIVE_SCHEME_COMMITMENTS',
        data: null
      });
    }

    // 2. Check transaction history for PMLA retention applicability
    const txnCount = await Payment.countDocuments({ userId: req.user._id, status: 'SUCCESSFUL' });

    if (txnCount > 0) {
      // Under PMLA, we must retain minimum records (KYC metadata and payments history) for 5 years.
      // We soft-delete/anonymize all non-essential PII fields and set retention expiry.
      user.kycDetails.personalInfo = {
        fullName: 'Anonymized User',
        dob: null,
        gender: 'Other',
        email: 'deleted@swarnabindu.com',
        profilePicture: null
      };
      
      user.kycDetails.identityVerification = {
        aadhaarNumber: null,
        aadhaarLast4: user.kycDetails.identityVerification.aadhaarLast4, // Retain last 4 for audit
        aadhaarFront: null,
        aadhaarBack: null,
        panNumber: null,
        panCardPhoto: null,
        digiLockerConnected: false
      };

      user.kycDetails.addressInfo = {
        houseName: 'Anonymized',
        street: 'Anonymized',
        city: 'Anonymized',
        state: 'Anonymized',
        pinCode: '000000'
      };

      user.kycDetails.bankDetails = {
        accountHolderName: 'Anonymized',
        bankName: 'Anonymized',
        accountNumber: null,
        accountLast4: user.kycDetails.bankDetails.accountLast4, // Retain last 4 for reconciliation logs
        ifscCode: 'XXXX0000000',
        branchName: 'Anonymized',
        upiId: null
      };

      user.kycDetails.selfieVerification = {
        selfiePath: null,
        capturedAt: null,
        dataRetentionExpiry: null
      };

      // Mask phone number and flag deletion
      const uniqSuffix = crypto.randomBytes(4).toString('hex');
      user.mobileNumber = `+910000000000_deleted_${uniqSuffix}`;
      user.isVerified = false;
      user.isBanned = true; // prevent login

      // Expiry retention set to 5 years from now
      user.dataRetentionExpiry = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000); 

      await user.save();

      // Withdraw consents
      await Consent.updateMany(
        { userId: req.user._id, isWithdrawn: false },
        { isWithdrawn: true, withdrawnAt: new Date() }
      );

      // Log data erasure request
      await AuditLog.create({
        userId: req.user._id,
        action: 'DATA_ERASURE_REQUEST',
        targetEntity: 'User',
        targetId: req.user._id,
        details: { retentionApplied: 'PMLA_5_YEAR_BUFFER', expiry: user.dataRetentionExpiry },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Your data erasure request has been processed. Under Prevention of Money Laundering Act (PMLA) regulations, transaction histories and bare audit logs are retained in a secure, encrypted compliance archive for 5 years before final deletion. Your personal PII details have been anonymized and account logins terminated.',
        errorCode: null,
        data: null
      });
    } else {
      // No transaction history. We can delete user fully immediately.
      await Consent.deleteMany({ userId: req.user._id });
      await UserScheme.deleteMany({ userId: req.user._id });
      await Payment.deleteMany({ userId: req.user._id });
      await GrievanceTicket.deleteMany({ userId: req.user._id });

      // Log deletion before removing user
      await AuditLog.create({
        action: 'DATA_ERASURE_REQUEST',
        targetEntity: 'User',
        targetId: req.user._id,
        details: { deletionType: 'IMMEDIATE_PURGE' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      await User.findByIdAndDelete(req.user._id);

      return res.status(200).json({
        success: true,
        message: 'Your account and all associated personal data have been completely erased under DPDP Act provisions.',
        errorCode: null,
        data: null
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit support/grievance ticket
 * @route   POST /api/v1/compliance/grievance
 * @access  Private
 */
const submitGrievance = async (req, res, next) => {
  try {
    const { subject, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required to log a grievance.',
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const ticketId = `GRV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const slaExpiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days SLA

    const ticket = await GrievanceTicket.create({
      ticketId,
      userId: req.user._id,
      subject,
      description,
      slaExpiryDate,
      history: [{
        status: 'OPEN',
        updatedBy: `Client: ${req.user.mobileNumber}`,
        notes: 'Ticket registered by user.'
      }]
    });

    return res.status(201).json({
      success: true,
      message: 'Grievance ticket logged successfully. Our Grievance officer will respond within the SLA window.',
      errorCode: null,
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List user grievances
 * @route   GET /api/v1/compliance/grievance
 * @access  Private
 */
const getMyGrievances = async (req, res, next) => {
  try {
    const tickets = await GrievanceTicket.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: 'Grievance tickets retrieved',
      errorCode: null,
      data: { tickets }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Grievance officer / Data Fiduciary contact details
 * @route   GET /api/v1/compliance/contact
 * @access  Public
 */
const getFiduciaryContact = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Data Fiduciary compliance contact details',
    errorCode: null,
    data: {
      dataFiduciary: 'Bictree Technologies / Swarna Bindu Gold Savings Scheme Trust',
      grievanceOfficerName: 'Ramesh K. Nair, Grievance Redressal Lead',
      email: 'grievance.officer@swarnabindu.com',
      contactNumber: '+91-484-2900290',
      address: 'Suite 402, Cyber Tower, Infopark Kochi, Kerala, 682030, India',
      resolutionSlaMaxDays: 90,
      regulatoryAuthority: 'Board of Trustees - Gold Savings Scheme (DPDP Act Grievances)'
    }
  });
};

module.exports = {
  getConsents,
  logConsent,
  withdrawConsent,
  exportData,
  requestErasure,
  submitGrievance,
  getMyGrievances,
  getFiduciaryContact
};
