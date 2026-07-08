const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    default: null, // null if system or client user initiated
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // set if client user initiated
    index: true
  },
  performedByEmail: {
    type: String,
    default: null // record email/name of agent for convenience
  },
  action: {
    type: String,
    required: true,
    enum: [
      'APPROVE_KYC',
      'REJECT_KYC',
      'BAN_USER',
      'UNBAN_USER',
      'CREATE_SCHEME',
      'UPDATE_SCHEME',
      'DELETE_SCHEME',
      'RECONCILE_PAYMENT',
      'UPDATE_GOLD_RATE',
      'CREATE_ADMIN',
      'UPDATE_ADMIN',
      // DPDP & Security Audit logs
      'VIEW_KYC_FULL',
      'VIEW_BANK_FULL',
      'ACCESS_PII',
      'DATA_ERASURE_REQUEST',
      'DATA_ACCESS_REQUEST',
      'DOWNLOAD_SECURE_MEDIA',
      'WITHDRAW_CONSENT',
      'LOG_INCIDENT'
    ]
  },
  targetEntity: {
    type: String,
    required: true
  }, // e.g. "User", "Scheme", "Payment", "GoldRate", "AdminUser", "GrievanceTicket", "Consent"
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }, // details/payload snapshot
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
