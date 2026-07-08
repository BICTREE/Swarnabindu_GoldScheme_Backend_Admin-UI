require('dotenv').config();
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');
const GoldRate = require('../models/GoldRate');
const connectDB = require('../config/db');

const schemesData = [
  {
    name: 'Swarna Bindu Popular',
    description: 'Build your wealth with disciplined monthly savings and get maturity benefits. Best for long term wealth creation.',
    monthlyInvestment: 5000,
    durationMonths: 11,
    maturityBenefitPercent: 8,
    minGoldGram: 10,
    termsAndConditions: '1. The scheme is valid for 11 months.\n2. Monthly installments must be paid on or before the due date.\n3. The user can cancel within 24 hours of joining with no penalty.\n4. Redemption is allowed in the form of gold coins or jewelry upon maturity.\n5. Pre-mature closure is subject to terms and conditions.',
    isActive: true
  },
  {
    name: 'Swarna Bindu Starter',
    description: 'A pocket-friendly plan to start your gold savings journey. Perfect for students and young professionals.',
    monthlyInvestment: 2000,
    durationMonths: 11,
    maturityBenefitPercent: 6,
    minGoldGram: 4,
    termsAndConditions: '1. The scheme is valid for 11 months.\n2. Monthly installments must be paid on or before the due date.\n3. Cancel within 24 hours of joining with zero penalty.\n4. Standard gold purity of 22K or 24K is guaranteed upon maturity.',
    isActive: true
  },
  {
    name: 'Swarna Bindu Elite',
    description: 'Maximize your savings with higher contributions and get premium maturity benefits. Tailored for high-growth plans.',
    monthlyInvestment: 10000,
    durationMonths: 11,
    maturityBenefitPercent: 10,
    minGoldGram: 20,
    termsAndConditions: '1. The scheme is valid for 11 months.\n2. Premium customer support and priority processing on maturity.\n3. Cancel within 24 hours of joining with zero penalty.\n4. Maturity benefits can be converted to 24K gold coins with zero making charges.',
    isActive: true
  }
];

const goldRateData = {
  rate22K_per_g: 6730.00,
  rate24K_per_8g: 56000.00, // 7000 per g * 8g
  lastUpdated: new Date()
};

const AdminUser = require('../models/AdminUser');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const UserScheme = require('../models/UserScheme');
const Payment = require('../models/Payment');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Scheme.deleteMany();
    await GoldRate.deleteMany();
    await AdminUser.deleteMany();
    await AuditLog.deleteMany();
    await User.deleteMany();
    await UserScheme.deleteMany();
    await Payment.deleteMany();
    console.log('Cleared existing Schemes, Gold Rates, AdminUsers, Users, UserSchemes, Payments, and AuditLogs.');

    // 1. Seed Schemes
    const seededSchemes = await Scheme.insertMany(schemesData);
    console.log(`Seeded ${seededSchemes.length} Schemes.`);
    const popularScheme = seededSchemes[0];

    // 2. Seed Gold Rate
    const seededGoldRate = await GoldRate.create(goldRateData);
    console.log(`Seeded Initial Gold Rate: 22K (1g) = ₹${seededGoldRate.rate22K_per_g}, 24K (8g) = ₹${seededGoldRate.rate24K_per_8g}`);

    // 3. Seed Super Admin
    const superAdmin = await AdminUser.create({
      email: 'admin@swarnabindu.com',
      password: 'admin123', // pre-save hook handles hashing
      name: 'System Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true
    });
    console.log(`Seeded Default Super Admin: ${superAdmin.email} (password: admin123)`);

    // 4. Seed Moderator
    const moderator = await AdminUser.create({
      email: 'moderator@swarnabindu.com',
      password: 'moderator123',
      name: 'Jane Moderator',
      role: 'MODERATOR',
      isActive: true
    });
    console.log(`Seeded Default Moderator: ${moderator.email} (password: moderator123)`);

    // 5. Seed Client User (KYC APPROVED)
    const approvedUser = await User.create({
      mobileNumber: '+919876543210',
      isVerified: true,
      kycStatus: 'APPROVED',
      kycDetails: {
        personalInfo: {
          fullName: 'John Mathew',
          dob: new Date('1995-05-15'),
          gender: 'Male',
          email: 'john@gmail.com',
          profilePicture: '/uploads/profiles/profile.png'
        },
        identityVerification: {
          aadhaarNumber: '123456784589',
          aadhaarFront: '/uploads/kyc/front.png',
          aadhaarBack: '/uploads/kyc/back.png',
          panNumber: 'ABCDE1234F',
          panCardPhoto: '/uploads/kyc/pan.png',
          digiLockerConnected: true
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
          branchName: 'MG Road, Kochi',
          upiId: 'john@okaxis'
        },
        selfieVerification: {
          selfiePath: '/uploads/selfies/selfie.png',
          capturedAt: new Date()
        }
      }
    });

    // 6. Seed Client User (KYC SUBMITTED - Awaiting Review)
    const submittedUser = await User.create({
      mobileNumber: '+919123456789',
      isVerified: true,
      kycStatus: 'SUBMITTED',
      kycDetails: {
        personalInfo: {
          fullName: 'Sarah Connor',
          dob: new Date('1990-11-23'),
          gender: 'Female',
          email: 'sarah@outlook.com',
          profilePicture: '/uploads/profiles/profile.png'
        },
        identityVerification: {
          aadhaarNumber: '987654321012',
          aadhaarFront: '/uploads/kyc/front.png',
          aadhaarBack: '/uploads/kyc/back.png',
          panNumber: 'WXYZP9876Q',
          panCardPhoto: '/uploads/kyc/pan.png',
          digiLockerConnected: false
        },
        addressInfo: {
          houseName: 'Sector 4',
          street: 'Cyber Highway',
          city: 'Bangalore',
          state: 'Karnataka',
          pinCode: '560001'
        },
        bankDetails: {
          accountHolderName: 'Sarah Connor',
          bankName: 'HDFC Bank Ltd.',
          accountNumber: '50100200300401',
          ifscCode: 'HDFC0000123',
          branchName: 'Koramangala, Bangalore',
          upiId: 'sarah@okhdfc'
        },
        selfieVerification: {
          selfiePath: '/uploads/selfies/selfie.png',
          capturedAt: new Date()
        }
      }
    });

    console.log('Seeded 2 Client Users (John Mathew - APPROVED, Sarah Connor - SUBMITTED).');

    // 7. Seed Active Subscription for John Mathew
    const activeSub = await UserScheme.create({
      userId: approvedUser._id,
      schemeId: popularScheme._id,
      monthlyInvestment: 5000,
      goldAccumulated: 0.714,
      totalPaid: 5000,
      status: 'ACTIVE',
      endDate: new Date('2027-05-08'),
      goalGoldGram: 10
    });
    console.log(`Seeded active scheme subscription for John Mathew.`);

    // 8. Seed Payment Transactions
    // Seed one Successful Transaction
    await Payment.create({
      userId: approvedUser._id,
      userSchemeId: activeSub._id,
      transactionId: 'TXN918273645',
      invoiceNo: 'INV-2026-1025',
      razorpayOrderId: 'order_abc123xyz',
      amount: 5000,
      goldGained: 0.714,
      paidAt: new Date('2026-06-08T12:00:00.000Z'),
      paymentMethod: 'UPI - Google Pay',
      status: 'SUCCESSFUL',
      installmentType: 'CURRENT_MONTH'
    });

    // Seed one Pending Transaction (reconcilable!)
    await Payment.create({
      userId: approvedUser._id,
      userSchemeId: activeSub._id,
      amount: 5000,
      status: 'PENDING',
      razorpayOrderId: 'order_pending_reconcile',
      installmentType: 'CURRENT_MONTH'
    });
    console.log(`Seeded payment history logs (1 Successful, 1 Pending).`);

    console.log('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
