require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Scheme = require('../models/Scheme');
const GoldRate = require('../models/GoldRate');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
  // Set env variables if not set
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_12345';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';

  // Start in-memory mongodb
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);

  // Seed default Schemes and Gold Rates
  await Scheme.create([
    {
      name: 'Swarna Bindu Popular',
      description: 'Build your wealth with disciplined monthly savings.',
      monthlyInvestment: 5000,
      durationMonths: 11,
      maturityBenefitPercent: 8,
      minGoldGram: 10,
      termsAndConditions: '1. Standard terms apply.',
      isActive: true
    }
  ]);

  await GoldRate.create({
    rate22K_per_g: 7000.00,
    rate24K_per_8g: 56000.00, // 7000 per g * 8g
    lastUpdated: new Date()
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Swarna Bindu Client REST API Integration Tests', () => {
  const testMobile = '+919876543210';
  let accessToken = '';
  let refreshToken = '';
  let schemeId = '';
  let userSchemeId = '';
  let transactionId = '';
  let txnString = '';
  let notificationId = '';

  // --- AUTHENTICATION TESTS ---
  describe('Auth Endpoints', () => {
    it('should request OTP successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ mobileNumber: testMobile });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.otpSent).toBe(true);
    });

    it('should fail verify OTP with wrong code', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ mobileNumber: testMobile, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('INVALID_OTP');
    });

    it('should verify OTP and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ mobileNumber: testMobile, otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should refresh access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    });
  });

  // --- USER PROFILE & KYC TESTS ---
  describe('User & KYC Endpoints', () => {
    it('should fail getting profile without auth token', async () => {
      const res = await request(app).get('/api/v1/user/profile');
      expect(res.status).toBe(401);
    });

    it('should get profile (KYC status PENDING)', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.kycStatus).toBe('PENDING');
      expect(res.body.data.investments.totalSavingsValue).toBe(0);
    });

    it('should update KYC Step 1: Personal details', async () => {
      const res = await request(app)
        .put('/api/v1/user/kyc/personal')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('fullName', 'John Mathew')
        .field('dob', '1995-05-15')
        .field('gender', 'Male')
        .field('email', 'john@gmail.com')
        .attach('profilePicture', Buffer.from('dummy profile pic'), 'profile.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.personalInfo.fullName).toBe('John Mathew');
    });

    it('should update KYC Step 2: Identity documentation', async () => {
      const res = await request(app)
        .put('/api/v1/user/kyc/identity')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('aadhaarNumber', '123456784589')
        .field('panNumber', 'ABCDE1234F')
        .attach('aadhaarFront', Buffer.from('front adhar'), 'front.png')
        .attach('aadhaarBack', Buffer.from('back adhar'), 'back.png')
        .attach('panCardPhoto', Buffer.from('pan card'), 'pan.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.identityVerification.aadhaarNumber).toBe('123456784589');
    });

    it('should update KYC Step 3: Address', async () => {
      const res = await request(app)
        .put('/api/v1/user/kyc/address')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          houseName: 'Green Villa',
          street: 'MG Road',
          city: 'Kochi',
          district: 'Ernakulam',
          state: 'Kerala',
          pinCode: '682001'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.addressInfo.city).toBe('Kochi');
    });

    it('should update KYC Step 4: Bank Details', async () => {
      const res = await request(app)
        .put('/api/v1/user/kyc/bank')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountHolderName: 'John Mathew',
          bankName: 'Axis Bank Ltd.',
          accountNumber: '919876543210',
          confirmAccountNumber: '919876543210',
          ifscCode: 'UTIB0001234',
          branchName: 'MG Road, Kochi'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankDetails.bankName).toBe('Axis Bank Ltd.');
    });

    it('should submit KYC Step 5: Selfie', async () => {
      const res = await request(app)
        .post('/api/v1/user/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('selfie', Buffer.from('selfie content'), 'selfie.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kycStatus).toBe('SUBMITTED');
    });
  });

  // --- UNIFIED KYC SINGLE-CALL SUBMISSION (/kyc/submit-full) ---
  describe('Unified KYC Single-Call Submission (/kyc/submit-full)', () => {
    const unifiedUserMobile = '+919999888877';
    let unifiedUserToken = '';

    beforeAll(async () => {
      // Authenticate a fresh user for unified KYC testing
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ mobileNumber: unifiedUserMobile });

      const otpRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ mobileNumber: unifiedUserMobile, otp: '123456' });

      unifiedUserToken = otpRes.body.data.accessToken;
    });

    it('should fail /kyc/submit-full without auth token', async () => {
      const res = await request(app).post('/api/v1/user/kyc/submit-full');
      expect(res.status).toBe(401);
    });

    it('should fail /kyc/submit-full if selfie is missing', async () => {
      const res = await request(app)
        .post('/api/v1/user/kyc/submit-full')
        .set('Authorization', `Bearer ${unifiedUserToken}`)
        .field('fullName', 'Ravi Kumar')
        .field('dob', '1995-06-15')
        .field('gender', 'Male')
        .field('email', 'ravi@example.com')
        .field('aadhaarNumber', '123456789012')
        .field('panNumber', 'ABCDE1234F')
        .field('houseName', 'Green Villa')
        .field('street', 'MG Road')
        .field('city', 'Thrissur')
        .field('district', 'Thrissur')
        .field('state', 'Kerala')
        .field('pinCode', '680001')
        .field('accountHolderName', 'Ravi Kumar')
        .field('bankName', 'State Bank of India')
        .field('accountNumber', '123456789012')
        .field('confirmAccountNumber', '123456789012')
        .field('ifscCode', 'SBIN0001234')
        .field('branchName', 'Thrissur Main');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('SELFIE_REQUIRED');
    });

    it('should fail /kyc/submit-full on invalid personal info (bad email)', async () => {
      const res = await request(app)
        .post('/api/v1/user/kyc/submit-full')
        .set('Authorization', `Bearer ${unifiedUserToken}`)
        .field('fullName', 'Ravi Kumar')
        .field('dob', '1995-06-15')
        .field('gender', 'Male')
        .field('email', 'not-a-valid-email')
        .field('aadhaarNumber', '123456789012')
        .field('panNumber', 'ABCDE1234F')
        .field('houseName', 'Green Villa')
        .field('street', 'MG Road')
        .field('city', 'Thrissur')
        .field('district', 'Thrissur')
        .field('state', 'Kerala')
        .field('pinCode', '680001')
        .field('accountHolderName', 'Ravi Kumar')
        .field('bankName', 'State Bank of India')
        .field('accountNumber', '123456789012')
        .field('confirmAccountNumber', '123456789012')
        .field('ifscCode', 'SBIN0001234')
        .field('branchName', 'Thrissur Main')
        .attach('selfie', Buffer.from('selfie'), 'selfie.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Personal info');
    });

    it('should fail /kyc/submit-full on invalid Aadhaar (less than 12 digits)', async () => {
      const res = await request(app)
        .post('/api/v1/user/kyc/submit-full')
        .set('Authorization', `Bearer ${unifiedUserToken}`)
        .field('fullName', 'Ravi Kumar')
        .field('dob', '1995-06-15')
        .field('gender', 'Male')
        .field('email', 'ravi@example.com')
        .field('aadhaarNumber', '123456') // invalid length
        .field('panNumber', 'ABCDE1234F')
        .field('houseName', 'Green Villa')
        .field('street', 'MG Road')
        .field('city', 'Thrissur')
        .field('district', 'Thrissur')
        .field('state', 'Kerala')
        .field('pinCode', '680001')
        .field('accountHolderName', 'Ravi Kumar')
        .field('bankName', 'State Bank of India')
        .field('accountNumber', '123456789012')
        .field('confirmAccountNumber', '123456789012')
        .field('ifscCode', 'SBIN0001234')
        .field('branchName', 'Thrissur Main')
        .attach('selfie', Buffer.from('selfie'), 'selfie.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Identity info');
    });

    it('should fail /kyc/submit-full on bank account mismatch', async () => {
      const res = await request(app)
        .post('/api/v1/user/kyc/submit-full')
        .set('Authorization', `Bearer ${unifiedUserToken}`)
        .field('fullName', 'Ravi Kumar')
        .field('dob', '1995-06-15')
        .field('gender', 'Male')
        .field('email', 'ravi@example.com')
        .field('aadhaarNumber', '123456789012')
        .field('panNumber', 'ABCDE1234F')
        .field('houseName', 'Green Villa')
        .field('street', 'MG Road')
        .field('city', 'Thrissur')
        .field('district', 'Thrissur')
        .field('state', 'Kerala')
        .field('pinCode', '680001')
        .field('accountHolderName', 'Ravi Kumar')
        .field('bankName', 'State Bank of India')
        .field('accountNumber', '123456789012')
        .field('confirmAccountNumber', '999999999999') // mismatch
        .field('ifscCode', 'SBIN0001234')
        .field('branchName', 'Thrissur Main')
        .attach('selfie', Buffer.from('selfie'), 'selfie.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Bank details');
    });

    it('should successfully submit full KYC with all sections & all 5 files in one call', async () => {
      const res = await request(app)
        .post('/api/v1/user/kyc/submit-full')
        .set('Authorization', `Bearer ${unifiedUserToken}`)
        // 1. Personal Info
        .field('fullName', 'Ravi Kumar')
        .field('dob', '1995-06-15')
        .field('gender', 'Male')
        .field('email', 'ravi@example.com')
        .attach('profilePicture', Buffer.from('profile pic data'), 'profile.png')
        // 2. Identity Info
        .field('aadhaarNumber', '123456789012')
        .field('panNumber', 'ABCDE1234F')
        .field('digiLockerConnected', 'false')
        .attach('aadhaarFront', Buffer.from('aadhaar front data'), 'aadhaar_front.png')
        .attach('aadhaarBack', Buffer.from('aadhaar back data'), 'aadhaar_back.png')
        .attach('panCardPhoto', Buffer.from('pan photo data'), 'pan_card.png')
        // 3. Address Info
        .field('houseName', 'Green Villa')
        .field('street', 'MG Road')
        .field('landmark', 'Near Bus Stand')
        .field('city', 'Thrissur')
        .field('district', 'Thrissur')
        .field('state', 'Kerala')
        .field('pinCode', '680001')
        .field('latitude', 10.5276)
        .field('longitude', 76.2144)
        // 4. Bank Details
        .field('accountHolderName', 'Ravi Kumar')
        .field('bankName', 'State Bank of India')
        .field('accountNumber', '123456789012')
        .field('confirmAccountNumber', '123456789012')
        .field('ifscCode', 'SBIN0001234')
        .field('branchName', 'Thrissur Main Branch')
        .field('upiId', 'ravi@okhdfcbank')
        // 5. Selfie
        .attach('selfie', Buffer.from('live selfie data'), 'selfie.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kycStatus).toBe('SUBMITTED');
      expect(res.body.data.personalInfo.fullName).toBe('Ravi Kumar');
      expect(res.body.data.personalInfo.profilePicture).toMatch(/^\/uploads\/profiles\//);
      expect(res.body.data.identityVerification.aadhaarLast4).toBe('9012');
      expect(res.body.data.identityVerification.aadhaarFront).toMatch(/^\/uploads\/kyc\//);
      expect(res.body.data.identityVerification.aadhaarBack).toMatch(/^\/uploads\/kyc\//);
      expect(res.body.data.identityVerification.panCardPhoto).toMatch(/^\/uploads\/kyc\//);
      expect(res.body.data.addressInfo.city).toBe('Thrissur');
      expect(res.body.data.bankDetails.bankName).toBe('State Bank of India');
      expect(res.body.data.bankDetails.accountLast4).toBe('9012');
      expect(res.body.data.selfieDetails.selfiePath).toMatch(/^\/uploads\/selfies\//);

      // Verify direct database contents (encrypted at rest verification)
      const rawUser = await mongoose.connection.collection('users').findOne({ mobileNumber: unifiedUserMobile });
      expect(rawUser.kycStatus).toBe('SUBMITTED');
      expect(rawUser.kycDetails.identityVerification.aadhaarNumber).toContain(':'); // Encrypted format (iv:ciphertext)
      expect(rawUser.kycDetails.identityVerification.aadhaarLast4).toBe('9012');
      expect(rawUser.kycDetails.identityVerification.panNumber).toContain(':'); // Encrypted format
      expect(rawUser.kycDetails.bankDetails.accountNumber).toContain(':'); // Encrypted format
      expect(rawUser.kycDetails.bankDetails.accountLast4).toBe('9012');
    });
  });

  // --- SCHEMES CATALOG TESTS ---
  describe('Schemes Catalog Endpoints', () => {
    it('should list catalog schemes', async () => {
      const res = await request(app)
        .get('/api/v1/schemes')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.schemes.length).toBeGreaterThan(0);
      schemeId = res.body.data.schemes[0]._id;
    });

    it('should fail joining scheme before KYC approval', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/${schemeId}/join`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('KYC_REQUIRED');
    });

    it('should mock approve user KYC to test joining schemes', async () => {
      // Direct database update for test isolation
      await User.findOneAndUpdate({ mobileNumber: testMobile }, { kycStatus: 'APPROVED' });

      const res = await request(app)
        .get('/api/v1/user/kyc/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.body.data.kycStatus).toBe('APPROVED');
    });

    it('should join scheme successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/${schemeId}/join`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userScheme).toHaveProperty('id');
      userSchemeId = res.body.data.userScheme.id;
    });
  });

  // --- PAYMENTS TESTS ---
  describe('Payments Flow Endpoints', () => {
    it('should get outstanding dues schedule', async () => {
      const res = await request(app)
        .get('/api/v1/payments/dues')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nextDueAmount).toBe(5000);
    });

    it('should initialize a payment order session', async () => {
      const res = await request(app)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userSchemeId,
          installmentType: 'CURRENT_MONTH',
          amount: 5000
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('transactionId');
      expect(res.body.data).toHaveProperty('razorpayOrderId');
      transactionId = res.body.data.transactionId;
    });

    it('should verify payment successfully and credit gold weight', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionId,
          status: 'SUCCESSFUL',
          paymentMethod: 'UPI - Google Pay'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.status).toBe('SUCCESSFUL');
      expect(res.body.data.userScheme.goldAccumulated).toBeGreaterThan(0); // 5000 / 7000 = ~0.714 g
      txnString = res.body.data.payment.transactionId;
    });

    it('should get payment history logs', async () => {
      const res = await request(app)
        .get('/api/v1/payments/history')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.history.length).toBeGreaterThan(0);
    });

    it('should retrieve payment receipt metadata as JSON', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/receipt/${txnString}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipt).toHaveProperty('amountPaid', 5000);
      expect(res.body.data.receipt).toHaveProperty('schemeName', 'Swarna Bindu Popular');
    });

    it('should download branded payment receipt PDF via /receipt/:transactionId/download', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/receipt/${txnString}/download`)
        .set('Authorization', `Bearer ${accessToken}`)
        .buffer()
        .parse((res, callback) => {
          res.data = Buffer.from([]);
          res.on('data', (chunk) => { res.data = Buffer.concat([res.data, chunk]); });
          res.on('end', () => callback(null, res.data));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('filename="receipt-');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('should download payment receipt PDF as attachment with ?download=true', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/receipt/${txnString}/download?download=true`)
        .set('Authorization', `Bearer ${accessToken}`)
        .buffer()
        .parse((res, callback) => {
          res.data = Buffer.from([]);
          res.on('data', (chunk) => { res.data = Buffer.concat([res.data, chunk]); });
          res.on('end', () => callback(null, res.data));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(Buffer.isBuffer(res.body)).toBe(true);
    });

    it('should download payment receipt PDF via /:id/receipt', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/${transactionId}/receipt`)
        .set('Authorization', `Bearer ${accessToken}`)
        .buffer()
        .parse((res, callback) => {
          res.data = Buffer.from([]);
          res.on('data', (chunk) => { res.data = Buffer.concat([res.data, chunk]); });
          res.on('end', () => callback(null, res.data));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('should prevent unauthorized users from downloading other user receipt (IDOR protection)', async () => {
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ mobileNumber: '+919999988888' });
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ mobileNumber: '+919999988888', otp: '123456' });
      const otherUserToken = verifyRes.body.data.accessToken;

      const res = await request(app)
        .get(`/api/v1/payments/receipt/${txnString}/download`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('UNAUTHORIZED_ACCESS');
    });

    it('should return 404 when downloading non-existent receipt', async () => {
      const res = await request(app)
        .get('/api/v1/payments/receipt/TXN999999999999/download')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('RECEIPT_NOT_FOUND');
    });
  });

  // --- USER DASHBOARD AGGREGATION TESTS ---
  describe('User Dashboard Aggregation Endpoint', () => {
    it('should fail getting dashboard without auth token', async () => {
      const res = await request(app).get('/api/v1/user/dashboard');
      expect(res.status).toBe(401);
    });

    it('should get complete customer dashboard in a single call with populated savings & portfolio', async () => {
      const res = await request(app)
        .get('/api/v1/user/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user).toHaveProperty('mobileNumber', testMobile);
      expect(res.body.data).toHaveProperty('goldRate');
      expect(res.body.data.goldRate).toHaveProperty('ratePerGram24K', 7000);
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data.summary.activeSchemes).toBe(1);
      expect(res.body.data.summary.totalAmountPaid).toBe(5000);
      expect(res.body.data.summary.totalGramsSaved).toBeGreaterThan(0);
      expect(res.body.data.summary.currentGoldValue).toBeGreaterThan(0);
      expect(res.body.data).toHaveProperty('portfolio');
      expect(res.body.data.portfolio.length).toBe(1);
      expect(res.body.data.portfolio[0].schemeName).toBe('Swarna Bindu Popular');
      expect(res.body.data.portfolio[0].status).toBe('ACTIVE');
      expect(res.body.data.portfolio[0].installmentsPaid).toBe(1);
      expect(res.body.data.portfolio[0].totalInstallments).toBe(11);
      expect(res.body.data.portfolio[0].remainingInstallments).toBe(10);
    });

    it('should also work via /api/v1/users/dashboard route alias', async () => {
      const res = await request(app)
        .get('/api/v1/users/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('portfolio');
    });
  });

  // --- GOLD REDEMPTION & ALERTS ---
  describe('Gold and Alerts Endpoints', () => {
    it('should fetch today\'s gold rates with fluctuation mock', async () => {
      const res = await request(app).get('/api/v1/gold-rate/today');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('rate22K_per_g');
    });

    it('should redeem accumulated gold coins', async () => {
      // Get accumulated balance
      const profile = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${accessToken}`);
      
      const bal = profile.body.data.investments.totalGoldAccumulated;

      const res = await request(app)
        .post('/api/v1/gold/redeem')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userSchemeId,
          goldQuantity: bal
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.redemption.status).toBe('REDEEMED');
      expect(res.body.data.redemption.remainingGoldGrams).toBe(0);
    });

    it('should register mobile device notification token', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/register-device')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceToken: 'fcm_mock_token_12345' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should retrieve client notifications alerts', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.length).toBeGreaterThan(0);
      notificationId = res.body.data.notifications[0]._id;
    });

    it('should mark notification as read', async () => {
      const res = await request(app)
        .put(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.isRead).toBe(true);
    });
  });
});
