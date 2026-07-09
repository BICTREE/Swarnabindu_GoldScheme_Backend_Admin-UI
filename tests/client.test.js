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
    });

    it('should get payment history logs', async () => {
      const res = await request(app)
        .get('/api/v1/payments/history')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.history.length).toBeGreaterThan(0);
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
