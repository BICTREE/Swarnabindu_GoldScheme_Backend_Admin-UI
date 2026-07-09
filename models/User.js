const mongoose = require('mongoose');
const { encryptField, decryptField } = require('../utils/encryption');

const UserSchema = new mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  deviceToken: {
    type: String,
    default: null
  },
  kycStatus: {
    type: String,
    enum: ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  kycDetails: {
    personalInfo: {
      fullName: { type: String, default: null },
      dob: { type: Date, default: null },
      gender: { type: String, enum: ['Male', 'Female', 'Other'], default: null },
      email: { type: String, default: null },
      profilePicture: { type: String, default: null }
    },
    identityVerification: {
      aadhaarNumber: { type: String, default: null }, // Encrypted at rest
      aadhaarLast4: { type: String, default: null },  // Plaintext queryable
      aadhaarFront: { type: String, default: null },
      aadhaarBack: { type: String, default: null },
      panNumber: { type: String, default: null },    // Encrypted at rest
      panCardPhoto: { type: String, default: null },
      digiLockerConnected: { type: Boolean, default: false }
    },
    addressInfo: {
      houseName: { type: String, default: null },
      street: { type: String, default: null },
      landmark: { type: String, default: null },
      city: { type: String, default: null },
      district: { type: String, default: null },
      state: { type: String, default: null },
      pinCode: { type: String, default: null },
      locationCoordinates: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
      }
    },
    
    bankDetails: {
      accountHolderName: { type: String, default: null },
      bankName: { type: String, default: null },
      accountNumber: { type: String, default: null }, // Encrypted at rest
      accountLast4: { type: String, default: null },  // Plaintext queryable
      ifscCode: { type: String, default: null },
      branchName: { type: String, default: null },
      upiId: { type: String, default: null }          // Encrypted at rest
    },
    selfieVerification: {
      selfiePath: { type: String, default: null },
      capturedAt: { type: Date, default: null },
      dataRetentionExpiry: { type: Date, default: null } // Biometric short retention
    },
    rejectedReason: { type: String, default: null },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    moderatedAt: { type: Date, default: null }
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  },
  dataRetentionExpiry: {
    type: Date,
    default: null // DPDP / PMLA Account closure retention expiry
  }
}, {
  timestamps: true
});

UserSchema.index({ "kycDetails.addressInfo.locationCoordinates": "2dsphere" });

// Pre-save hook to encrypt sensitive fields and capture last 4 digits
UserSchema.pre('save', async function() {
  const user = this;

  // 1. Aadhaar Encryption
  if (user.isModified('kycDetails.identityVerification.aadhaarNumber') && user.kycDetails.identityVerification.aadhaarNumber) {
    const raw = user.kycDetails.identityVerification.aadhaarNumber;
    // Decrypt if it was already encrypted in memory to avoid double encryption
    const plaintext = (raw.includes(':') && raw.split(':')[0].length === 32) ? decryptField(raw) : raw;
    if (plaintext && plaintext.length >= 4) {
      user.kycDetails.identityVerification.aadhaarLast4 = plaintext.slice(-4);
    }
    user.kycDetails.identityVerification.aadhaarNumber = encryptField(plaintext);
  }

  // 2. PAN Encryption
  if (user.isModified('kycDetails.identityVerification.panNumber') && user.kycDetails.identityVerification.panNumber) {
    const raw = user.kycDetails.identityVerification.panNumber;
    const plaintext = (raw.includes(':') && raw.split(':')[0].length === 32) ? decryptField(raw) : raw;
    user.kycDetails.identityVerification.panNumber = encryptField(plaintext);
  }

  // 3. Bank Account Encryption
  if (user.isModified('kycDetails.bankDetails.accountNumber') && user.kycDetails.bankDetails.accountNumber) {
    const raw = user.kycDetails.bankDetails.accountNumber;
    const plaintext = (raw.includes(':') && raw.split(':')[0].length === 32) ? decryptField(raw) : raw;
    if (plaintext && plaintext.length >= 4) {
      user.kycDetails.bankDetails.accountLast4 = plaintext.slice(-4);
    }
    user.kycDetails.bankDetails.accountNumber = encryptField(plaintext);
  }

  // 4. UPI ID Encryption
  if (user.isModified('kycDetails.bankDetails.upiId') && user.kycDetails.bankDetails.upiId) {
    const raw = user.kycDetails.bankDetails.upiId;
    const plaintext = (raw.includes(':') && raw.split(':')[0].length === 32) ? decryptField(raw) : raw;
    user.kycDetails.bankDetails.upiId = encryptField(plaintext);
  }
});

const decryptUserFields = (doc) => {
  if (doc.kycDetails) {
    if (doc.kycDetails.identityVerification) {
      if (doc.kycDetails.identityVerification.aadhaarNumber) {
        doc.kycDetails.identityVerification.aadhaarNumber = decryptField(doc.kycDetails.identityVerification.aadhaarNumber);
      }
      if (doc.kycDetails.identityVerification.panNumber) {
        doc.kycDetails.identityVerification.panNumber = decryptField(doc.kycDetails.identityVerification.panNumber);
      }
    }
    if (doc.kycDetails.bankDetails) {
      if (doc.kycDetails.bankDetails.accountNumber) {
        doc.kycDetails.bankDetails.accountNumber = decryptField(doc.kycDetails.bankDetails.accountNumber);
      }
      if (doc.kycDetails.bankDetails.upiId) {
        doc.kycDetails.bankDetails.upiId = decryptField(doc.kycDetails.bankDetails.upiId);
      }
    }
  }
};

// Decrypt fields after database loading or in-memory saving
UserSchema.post('init', decryptUserFields);
UserSchema.post('save', decryptUserFields);

module.exports = mongoose.model('User', UserSchema);
