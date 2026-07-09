const mongoose = require('mongoose');

const ConsentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  consentType: {
    type: String,
    enum: ['KYC', 'BIOMETRIC', 'MARKETING', 'KYC_SHARING'],
    required: true
  },
  purpose: {
    type: String,
    required: true // e.g. "Identity verification", "Facial recognition and biometric checks", "Marketing communications"
  },
  consentText: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  isWithdrawn: {
    type: Boolean,
    default: false
  },
  withdrawnAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

ConsentSchema.index({ userId: 1, consentType: 1 });

module.exports = mongoose.model('Consent', ConsentSchema);
