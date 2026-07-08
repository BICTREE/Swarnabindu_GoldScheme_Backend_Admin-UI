require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const Consent = require('../models/Consent');
const GrievanceTicket = require('../models/GrievanceTicket');
const IncidentLog = require('../models/IncidentLog');
const Payment = require('../models/Payment');
const UserScheme = require('../models/UserScheme');
const Scheme = require('../models/Scheme');
const jwt = require('jsonwebtoken');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_12345';
  process.env.FIELD_ENCRYPTION_KEY = '8f2495d46fcae33215286cd29a73e51a629f1234bce925ab8167cd9ef2b12345';

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Swarna Bindu Regulatory Compliance API Integration Tests', () => {
  let clientToken = '';
  let superAdminToken = '';
  let moderatorToken = '';
  let supportToken = '';

  let clientUserObj;
  let superAdminObj;
  let moderatorObj;
  let supportObj;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await AdminUser.deleteMany({});
    await Consent.deleteMany({});
    await GrievanceTicket.deleteMany({});
    await IncidentLog.deleteMany({});
    await Payment.deleteMany({});
    await UserScheme.deleteMany({});
    await Scheme.deleteMany({});

    // 1. Seed Client User
    clientUserObj = await User.create({
      mobileNumber: '+919999988888',
      isVerified: true,
      kycStatus: 'SUBMITTED',
      kycDetails: {
        personalInfo: {
          fullName: 'Siddharth Roy',
          email: 'siddharth@gmail.com',
          dob: new Date('1990-01-01'),
          gender: 'Male'
        },
        identityVerification: {
          aadhaarNumber: '123456781234', // Encrypted at rest
          panNumber: 'ABCDE1234F'        // Encrypted at rest
        },
        bankDetails: {
          accountNumber: '98765432101234', // Encrypted at rest
          upiId: 'siddharth@okaxis',       // Encrypted at rest
          bankName: 'ICICI Bank',
          ifscCode: 'ICIC0000123',
          branchName: 'Mumbai Office'
        }
      }
    });

    // 2. Seed Admin Users
    superAdminObj = await AdminUser.create({
      email: 'super@swarnabindu.com',
      password: 'adminpassword',
      name: 'Super Admin Agent',
      role: 'SUPER_ADMIN',
      isActive: true
    });

    moderatorObj = await AdminUser.create({
      email: 'mod@swarnabindu.com',
      password: 'adminpassword',
      name: 'Moderator Agent',
      role: 'MODERATOR',
      isActive: true
    });

    supportObj = await AdminUser.create({
      email: 'support@swarnabindu.com',
      password: 'adminpassword',
      name: 'Support Agent',
      role: 'SUPPORT',
      isActive: true
    });

    // Generate JWTs
    clientToken = jwt.sign({ id: clientUserObj._id }, process.env.JWT_ACCESS_SECRET);
    superAdminToken = jwt.sign({ id: superAdminObj._id, role: 'SUPER_ADMIN' }, process.env.JWT_ACCESS_SECRET);
    moderatorToken = jwt.sign({ id: moderatorObj._id, role: 'MODERATOR' }, process.env.JWT_ACCESS_SECRET);
    supportToken = jwt.sign({ id: supportObj._id, role: 'SUPPORT' }, process.env.JWT_ACCESS_SECRET);
  });

  describe('1. Field-Level Encryption Verification', () => {
    it('should store sensitive fields encrypted in MongoDB while returning plaintext inside hooks', async () => {
      // Find directly using native Mongo connection bypass to verify DB contents are encrypted
      const rawUserObj = await mongoose.connection.db.collection('users').findOne({ _id: clientUserObj._id });
      
      expect(rawUserObj.kycDetails.identityVerification.aadhaarNumber).toContain(':'); // Cipher contains IV separator
      expect(rawUserObj.kycDetails.identityVerification.aadhaarLast4).toBe('1234');
      
      expect(rawUserObj.kycDetails.bankDetails.accountNumber).toContain(':');
      expect(rawUserObj.kycDetails.bankDetails.accountLast4).toBe('1234');
      
      // Query through Mongoose (init hook decrypts in-memory)
      const mongooseUserObj = await User.findById(clientUserObj._id);
      expect(mongooseUserObj.kycDetails.identityVerification.aadhaarNumber).toBe('123456781234');
    });
  });

  describe('2. Role-Based Masking Middleware', () => {
    it('should return masked fields for standard Support roles (no elevated rights)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${clientUserObj._id}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Aadhaar and PAN should be masked
      expect(res.body.data.user.kycDetails.identityVerification.aadhaarNumber).toBe('XXXX-XXXX-1234');
      expect(res.body.data.user.kycDetails.identityVerification.panNumber).toBe('ABCDEXXXXF');
      
      // Bank account and UPI ID should be masked
      expect(res.body.data.user.kycDetails.bankDetails.accountNumber).toBe('******1234');
      expect(res.body.data.user.kycDetails.bankDetails.upiId).toBe('s*******h@okaxis');
    });

    it('should return unmasked fields for Super Admin and log the unmasked read', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${clientUserObj._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.kycDetails.identityVerification.aadhaarNumber).toBe('123456781234');
      expect(res.body.data.user.kycDetails.bankDetails.accountNumber).toBe('98765432101234');

      // Verify that access log entry is recorded in AuditLog
      const auditLog = await mongoose.connection.db.collection('auditlogs').findOne({
        action: 'VIEW_KYC_FULL',
        targetId: clientUserObj._id
      });
      expect(auditLog).toBeTruthy();
    });
  });

  describe('3. DPDP Consent & Portability Rights', () => {
    it('should record explicit consent logs and support withdrawal', async () => {
      // 1. Submit consent
      const consentRes = await request(app)
        .post('/api/v1/compliance/consent')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          consentType: 'KYC',
          purpose: 'Identity validation for gold savings scheme',
          consentText: 'I hereby authorize offline e-KYC validation.'
        });

      expect(consentRes.status).toBe(201);
      expect(consentRes.body.data.consent.consentType).toBe('KYC');

      // 2. Revoke consent
      const revokeRes = await request(app)
        .delete('/api/v1/compliance/consent/KYC')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(revokeRes.status).toBe(200);

      const dbConsent = await Consent.findOne({ userId: clientUserObj._id, consentType: 'KYC' });
      expect(dbConsent.isWithdrawn).toBe(true);
    });

    it('should compile and export all held data in data-portability request', async () => {
      const res = await request(app)
        .get('/api/v1/compliance/data-portability')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.body.fiduciaryName).toBe('Swarna Bindu Gold Savings Scheme');
      expect(res.body.profile.mobileNumber).toBe('+919999988888');
    });
  });

  describe('4. DPDP / PMLA Erasure Handling', () => {
    it('should anonymize and retain 5-year compliance record if payments transaction history exists', async () => {
      // Seed a payment transaction
      await Payment.create({
        userId: clientUserObj._id,
        userSchemeId: new mongoose.Types.ObjectId(),
        razorpayOrderId: 'order_test',
        amount: 2000,
        status: 'SUCCESSFUL',
        installmentType: 'CURRENT_MONTH'
      });

      const res = await request(app)
        .post('/api/v1/compliance/data-erasure')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Prevention of Money Laundering Act (PMLA) regulations');

      // Check user record in database: PII is anonymized but Last4 metadata remains
      const anonymizedUser = await User.findById(clientUserObj._id);
      expect(anonymizedUser.kycDetails.personalInfo.fullName).toBe('Anonymized User');
      expect(anonymizedUser.kycDetails.identityVerification.panNumber).toBeNull();
      expect(anonymizedUser.kycDetails.identityVerification.aadhaarLast4).toBe('1234');
      
      // Retention expiry should be 5 years from now
      expect(anonymizedUser.dataRetentionExpiry).toBeTruthy();
    });

    it('should fully delete user record immediately if no payments transaction history exists', async () => {
      const res = await request(app)
        .post('/api/v1/compliance/data-erasure')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('completely erased');

      // Verify user is gone from db
      const dbUserObj = await User.findById(clientUserObj._id);
      expect(dbUserObj).toBeNull();
    });
  });

  describe('5. Grievances and SLA Redresses', () => {
    it('should submit grievance ticket with 90-day SLA expiry automatically', async () => {
      const res = await request(app)
        .post('/api/v1/compliance/grievance')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          subject: 'KYC Upload Error',
          description: 'Unable to select Aadhaar front photo.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticket.ticketId).toContain('GRV-');
      
      // SLA should be exactly 90 days from today
      const now = Date.now();
      const expectedSla = new Date(now + 90 * 24 * 60 * 60 * 1000);
      const ticketSla = new Date(res.body.data.ticket.slaExpiryDate);
      expect(Math.abs(ticketSla - expectedSla)).toBeLessThan(5000); // 5s delta
    });
  });

  describe('6. CERT-In Security Breach Incidents Logging', () => {
    it('should authorize Super Admin to log incidents and block Support role', async () => {
      // Support role request should be forbidden
      const supportRes = await request(app)
        .post('/api/v1/admin/compliance/incidents/log')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          title: 'Database Port Probe Warning',
          description: 'Port probe scans detected from external IP.',
          severity: 'MEDIUM'
        });
      expect(supportRes.status).toBe(403);

      // Super Admin request should succeed
      const adminRes = await request(app)
        .post('/api/v1/admin/compliance/incidents/log')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Data Port Probe Warning',
          description: 'Port probe scans detected from external IP.',
          severity: 'MEDIUM',
          affectedComponents: ['Database Server'],
          estimatedImpactedUsers: 0
        });
      expect(adminRes.status).toBe(201);
      expect(adminRes.body.data.incident.incidentId).toContain('INC-');
    });
  });
});
