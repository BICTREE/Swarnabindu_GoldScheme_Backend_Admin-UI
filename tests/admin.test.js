require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const AdminUser = require('../models/AdminUser');
const User = require('../models/User');
const Scheme = require('../models/Scheme');
const Payment = require('../models/Payment');
const UserScheme = require('../models/UserScheme');
const GoldRate = require('../models/GoldRate');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_12345';

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);

  // 1. Seed Default Super Admin
  await AdminUser.create({
    email: 'admin@swarnabindu.com',
    password: 'admin123',
    name: 'Super Admin User',
    role: 'SUPER_ADMIN',
    isActive: true
  });

  // 2. Seed a Client User with SUBMITTED KYC for moderation tests
  const user = await User.create({
    mobileNumber: '+919876543210',
    isVerified: true,
    kycStatus: 'SUBMITTED',
    kycDetails: {
      personalInfo: {
        fullName: 'John Mathew',
        dob: new Date('1995-05-15'),
        gender: 'Male',
        email: 'john@gmail.com'
      },
      identityVerification: {
        aadhaarNumber: '123456784589',
        panNumber: 'ABCDE1234F'
      },
      addressInfo: {
        houseName: 'Green Villa',
        street: 'MG Road',
        city: 'Kochi',
        state: 'Kerala',
        pinCode: '682001'
      },
      bankDetails: {
        accountHolderName: 'John Mathew',
        bankName: 'Axis Bank Ltd.',
        accountNumber: '919876543210',
        ifscCode: 'UTIB0001234',
        branchName: 'MG Road, Kochi'
      }
    }
  });

  // 3. Seed initial Gold Rate
  await GoldRate.create({
    rate22K_per_g: 7000.00,
    rate24K_per_8g: 56000.00,
    lastUpdated: new Date()
  });

  // 4. Seed a Scheme
  const scheme = await Scheme.create({
    name: 'Swarna Bindu Starter',
    description: 'Starter plan description.',
    monthlyInvestment: 2000,
    durationMonths: 11,
    maturityBenefitPercent: 6,
    minGoldGram: 4,
    termsAndConditions: 'Terms.',
    isActive: true
  });

  // 5. Seed a UserScheme and Payment in PENDING status for reconciliation tests
  const userScheme = await UserScheme.create({
    userId: user._id,
    schemeId: scheme._id,
    monthlyInvestment: 2000,
    goalGoldGram: 4,
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 11 * 24 * 60 * 60 * 1000)
  });

  await Payment.create({
    userId: user._id,
    userSchemeId: userScheme._id,
    amount: 2000,
    installmentType: 'CURRENT_MONTH',
    status: 'PENDING',
    razorpayOrderId: 'order_test_reconcile'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Swarna Bindu Admin REST API Integration Tests', () => {
  let superToken = '';
  let modToken = '';
  let clientUserId = '';
  let newSchemeId = '';
  let pendingPaymentId = '';

  describe('Admin Auth & Management', () => {
    it('should log in as seeded Super Admin', async () => {
      const res = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({ email: 'admin@swarnabindu.com', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.role).toBe('SUPER_ADMIN');
      superToken = res.body.data.accessToken;
    });

    it('should create a Moderator account (Super Admin only)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/auth/create-admin')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: 'moderator@swarnabindu.com',
          password: 'moderator123',
          name: 'Jane Moderator',
          role: 'MODERATOR'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.role).toBe('MODERATOR');
    });

    it('should log in as created Moderator', async () => {
      const res = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({ email: 'moderator@swarnabindu.com', password: 'moderator123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      modToken = res.body.data.accessToken;
    });

    it('should fail to create admin if logged in as Moderator', async () => {
      const res = await request(app)
        .post('/api/v1/admin/auth/create-admin')
        .set('Authorization', `Bearer ${modToken}`)
        .send({
          email: 'another@swarnabindu.com',
          password: 'another123',
          name: 'Another Admin',
          role: 'SUPPORT'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('User and KYC Management', () => {
    it('should list client users (Moderator access)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThan(0);
      clientUserId = res.body.data.users[0]._id;
    });

    it('should view client detailed profile', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${clientUserId}`)
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.mobileNumber).toBe('+919876543210');
    });

    it('should list pending KYC profiles', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/pending')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pendingList.length).toBeGreaterThan(0);
    });

    it('should approve client KYC', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/kyc/${clientUserId}/approve`)
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kycStatus).toBe('APPROVED');
    });

    it('should ban a client user', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/users/${clientUserId}/ban`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ isBanned: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isBanned).toBe(true);
    });
  });

  describe('Schemes Template Catalog CRUD', () => {
    it('should create new scheme', async () => {
      const res = await request(app)
        .post('/api/v1/admin/schemes')
        .set('Authorization', `Bearer ${modToken}`)
        .send({
          name: 'Swarna Bindu Platinum',
          description: 'High-growth plan.',
          monthlyInvestment: 15000,
          durationMonths: 11,
          maturityBenefitPercent: 12,
          minGoldGram: 30,
          termsAndConditions: '1. Standard terms apply.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      newSchemeId = res.body.data.scheme._id;
    });

    it('should update scheme parameters', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/schemes/${newSchemeId}`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ description: 'High-growth plan updated description.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scheme.description).toContain('updated');
    });

    it('should soft delete/toggle scheme catalog template', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/schemes/${newSchemeId}`)
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('should view platform subscriptions list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/schemes/subscriptions')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Payments and Gold Rate Controls', () => {
    it('should list payments transactions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payments')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payments.length).toBeGreaterThan(0);
      pendingPaymentId = res.body.data.payments[0]._id;
    });

    it('should reject payment reconciliation for Moderator', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/payments/${pendingPaymentId}/reconcile`)
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(403);
    });

    it('should reconcile payment successfully as Super Admin', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/payments/${pendingPaymentId}/reconcile`)
        .set('Authorization', `Bearer ${superToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.status).toBe('SUCCESSFUL');
    });

    it('should manually update live gold rate overrides', async () => {
      const res = await request(app)
        .post('/api/v1/admin/gold-rate/update')
        .set('Authorization', `Bearer ${modToken}`)
        .send({
          rate22K_per_g: 7200.00,
          rate24K_per_8g: 60000.00
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.goldRate.rate22K_per_g).toBe(7200);
    });
  });

  describe('Platform Dashboard, Audit Logs, and Notices', () => {
    it('should view dashboard statistics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.total).toBe(1);
      expect(res.body.data.financials.totalRevenueReceived).toBe(2000);
    });

    it('should reject audit logs view for Moderator', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(403);
    });

    it('should fetch audit logs successfully for Super Admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs.length).toBeGreaterThan(0);
    });

    it('should send broadcast notice', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${modToken}`)
        .send({
          title: 'System Alert',
          message: 'Maintenance upcoming.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should send targeted user notice alert', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/notifications/user/${clientUserId}`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({
          title: 'Direct Alert',
          message: 'Your account is under watch.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
