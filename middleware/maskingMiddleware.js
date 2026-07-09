const AuditLog = require('../models/AuditLog');

const maskAadhaar = (num) => {
  if (!num) return num;
  const clean = String(num).replace(/[^0-9]/g, '');
  if (clean.length < 4) return 'XXXX-XXXX-XXXX';
  return `XXXX-XXXX-${clean.slice(-4)}`;
};

const maskPan = (pan) => {
  if (!pan) return pan;
  const clean = String(pan).toUpperCase();
  if (clean.length < 10) return 'XXXXX0000X';
  return `${clean.slice(0, 5)}XXXX${clean.slice(-1)}`;
};

const maskBankNumber = (acc) => {
  if (!acc) return acc;
  const clean = String(acc);
  if (clean.length < 4) return '******';
  return `******${clean.slice(-4)}`;
};

const maskUpiId = (upi) => {
  if (!upi) return upi;
  const parts = String(upi).split('@');
  if (parts.length < 2) return upi;
  const handle = parts[0];
  const domain = parts[1];
  if (handle.length <= 2) return `*@${domain}`;
  return `${handle[0]}${'*'.repeat(handle.length - 2)}${handle[handle.length - 1]}@${domain}`;
};

/**
 * Middleware to dynamically mask sensitive fields (Aadhaar, PAN, Bank Account, UPI) in JSON responses.
 * Also automatically logs unmasked PII reads to the security audit trail.
 */
const sensitiveFieldsMasker = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    if (data && data.success && data.data) {
      let isKycFull = false;
      let isBankFull = false;

      // Check admin role permissions
      if (req.admin) {
        if (req.admin.role === 'SUPER_ADMIN') {
          isKycFull = true;
          isBankFull = true;
        } else if (req.admin.role === 'MODERATOR') {
          isKycFull = true;
        }
      }

      const auditLogsToCreate = [];

      const processUser = (userDoc) => {
        if (!userDoc || !userDoc.kycDetails) return;

        // If doc is mongoose document, convert to object to allow modification
        const rawDoc = userDoc.toObject ? userDoc.toObject() : userDoc;

        // 1. Aadhaar Masking & Logging
        if (rawDoc.kycDetails.identityVerification && rawDoc.kycDetails.identityVerification.aadhaarNumber) {
          const rawAadhaar = rawDoc.kycDetails.identityVerification.aadhaarNumber;
          if (!rawAadhaar.includes('XXXX-XXXX')) {
            if (isKycFull) {
              auditLogsToCreate.push({
                adminId: req.admin ? req.admin._id : null,
                performedByEmail: req.admin ? req.admin.email : 'System',
                action: 'VIEW_KYC_FULL',
                targetEntity: 'User',
                targetId: rawDoc._id,
                details: { fieldAccessed: 'aadhaarNumber', ipAddress: req.ip },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
              });
            } else {
              rawDoc.kycDetails.identityVerification.aadhaarNumber = maskAadhaar(rawAadhaar);
            }
          }
        }

        // 2. PAN Masking & Logging
        if (rawDoc.kycDetails.identityVerification && rawDoc.kycDetails.identityVerification.panNumber) {
          const rawPan = rawDoc.kycDetails.identityVerification.panNumber;
          if (!rawPan.includes('XXXX')) {
            if (isKycFull) {
              auditLogsToCreate.push({
                adminId: req.admin ? req.admin._id : null,
                performedByEmail: req.admin ? req.admin.email : 'System',
                action: 'VIEW_KYC_FULL',
                targetEntity: 'User',
                targetId: rawDoc._id,
                details: { fieldAccessed: 'panNumber', ipAddress: req.ip },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
              });
            } else {
              rawDoc.kycDetails.identityVerification.panNumber = maskPan(rawPan);
            }
          }
        }

        // 3. Bank Account Masking & Logging
        if (rawDoc.kycDetails.bankDetails && rawDoc.kycDetails.bankDetails.accountNumber) {
          const rawAccount = rawDoc.kycDetails.bankDetails.accountNumber;
          if (!rawAccount.includes('******')) {
            if (isBankFull) {
              auditLogsToCreate.push({
                adminId: req.admin ? req.admin._id : null,
                performedByEmail: req.admin ? req.admin.email : 'System',
                action: 'VIEW_BANK_FULL',
                targetEntity: 'User',
                targetId: rawDoc._id,
                details: { fieldAccessed: 'accountNumber', ipAddress: req.ip },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
              });
            } else {
              rawDoc.kycDetails.bankDetails.accountNumber = maskBankNumber(rawAccount);
            }
          }
        }

        // 4. UPI ID Masking & Logging
        if (rawDoc.kycDetails.bankDetails && rawDoc.kycDetails.bankDetails.upiId) {
          const rawUpi = rawDoc.kycDetails.bankDetails.upiId;
          if (rawUpi.includes('@') && !rawUpi.includes('***')) {
            if (isBankFull) {
              auditLogsToCreate.push({
                adminId: req.admin ? req.admin._id : null,
                performedByEmail: req.admin ? req.admin.email : 'System',
                action: 'VIEW_BANK_FULL',
                targetEntity: 'User',
                targetId: rawDoc._id,
                details: { fieldAccessed: 'upiId', ipAddress: req.ip },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
              });
            } else {
              rawDoc.kycDetails.bankDetails.upiId = maskUpiId(rawUpi);
            }
          }
        }

        // Apply mutations back
        if (userDoc.toObject) {
          // If it is a Mongoose document, set values directly on the Mongoose object so they persist in response serializer
          if (rawDoc.kycDetails.identityVerification) {
            userDoc.kycDetails.identityVerification.aadhaarNumber = rawDoc.kycDetails.identityVerification.aadhaarNumber;
            userDoc.kycDetails.identityVerification.panNumber = rawDoc.kycDetails.identityVerification.panNumber;
          }
          if (rawDoc.kycDetails.bankDetails) {
            userDoc.kycDetails.bankDetails.accountNumber = rawDoc.kycDetails.bankDetails.accountNumber;
            userDoc.kycDetails.bankDetails.upiId = rawDoc.kycDetails.bankDetails.upiId;
          }
        } else {
          // Plain object
          userDoc.kycDetails = rawDoc.kycDetails;
        }
      };

      // Process single object or array
      if (data.data.user) {
        processUser(data.data.user);
      } else if (data.data.users && Array.isArray(data.data.users)) {
        data.data.users.forEach(processUser);
      } else if (data.data.profile) {
        processUser(data.data.profile);
      }

      // Write security logs asynchronously
      if (auditLogsToCreate.length > 0) {
        AuditLog.insertMany(auditLogsToCreate).catch(err => console.error('Failed to create audit logs for unmasked view:', err));
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  sensitiveFieldsMasker
};
