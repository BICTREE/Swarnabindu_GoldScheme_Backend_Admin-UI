require('dotenv').config();
const mongoose = require('mongoose');

const Scheme = require('../models/Scheme');
const GoldRate = require('../models/GoldRate');
const AdminUser = require('../models/AdminUser');
const User = require('../models/User');
const UserScheme = require('../models/UserScheme');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Consent = require('../models/Consent');
const AuditLog = require('../models/AuditLog');
const RefreshToken = require('../models/RefreshToken');

// ─────────────────────────────────────────────────────────────
//  SEED DATA
// ─────────────────────────────────────────────────────────────

const schemesData = [
  {
    name: 'Swarna Bindu Starter',
    description: 'A pocket-friendly plan to start your gold savings journey. Perfect for students and young professionals.',
    monthlyInvestment: 2000,
    durationMonths: 11,
    maturityBenefitPercent: 6,
    minGoldGram: 4,
    termsAndConditions:
      '1. The scheme is valid for 11 months.\n2. Monthly installments must be paid on or before the due date.\n3. Cancel within 24 hours of joining with zero penalty.\n4. Standard gold purity of 22K or 24K is guaranteed upon maturity.',
    isActive: true
  },
  {
    name: 'Swarna Bindu Popular',
    description: 'Build your wealth with disciplined monthly savings and get maturity benefits. Best for long term wealth creation.',
    monthlyInvestment: 5000,
    durationMonths: 11,
    maturityBenefitPercent: 8,
    minGoldGram: 10,
    termsAndConditions:
      '1. The scheme is valid for 11 months.\n2. Monthly installments must be paid on or before the due date.\n3. The user can cancel within 24 hours of joining with no penalty.\n4. Redemption is allowed in the form of gold coins or jewelry upon maturity.\n5. Pre-mature closure is subject to terms and conditions.',
    isActive: true
  },
  {
    name: 'Swarna Bindu Elite',
    description: 'Maximize your savings with higher contributions and get premium maturity benefits. Tailored for high-growth plans.',
    monthlyInvestment: 10000,
    durationMonths: 11,
    maturityBenefitPercent: 10,
    minGoldGram: 20,
    termsAndConditions:
      '1. The scheme is valid for 11 months.\n2. Premium customer support and priority processing on maturity.\n3. Cancel within 24 hours of joining with zero penalty.\n4. Maturity benefits can be converted to 24K gold coins with zero making charges.',
    isActive: true
  }
];

const goldRateData = {
  rate22K_per_g: 6730.00,
  rate24K_per_8g: 56000.00,
  lastUpdated: new Date()
};

// ─────────────────────────────────────────────────────────────
//  MAIN SEEDER
// ─────────────────────────────────────────────────────────────

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n🌱 Connected to MongoDB — Starting seed...\n');

    // ── WIPE ──────────────────────────────────────────────────
    await Promise.all([
      Scheme.deleteMany(),
      GoldRate.deleteMany(),
      AdminUser.deleteMany(),
      User.deleteMany(),
      UserScheme.deleteMany(),
      Payment.deleteMany(),
      Notification.deleteMany(),
      Consent.deleteMany(),
      AuditLog.deleteMany(),
      RefreshToken.deleteMany()
    ]);
    console.log('🗑️  Cleared all existing collections.\n');

    // ── 1. SCHEMES ────────────────────────────────────────────
    const [starterScheme, popularScheme, eliteScheme] = await Scheme.insertMany(schemesData);
    console.log(`✅ Seeded ${schemesData.length} Schemes (Starter, Popular, Elite).`);

    // ── 2. GOLD RATE ──────────────────────────────────────────
    await GoldRate.create(goldRateData);
    console.log(`✅ Seeded Gold Rate: 22K = ₹${goldRateData.rate22K_per_g}/g | 24K (8g) = ₹${goldRateData.rate24K_per_8g}`);

    // ── 3. ADMIN ACCOUNTS ─────────────────────────────────────
    const superAdmin = await AdminUser.create({
      email: 'admin@swarnabindu.com',
      password: 'Admin@123',
      name: 'System Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true
    });

    const moderator = await AdminUser.create({
      email: 'moderator@swarnabindu.com',
      password: 'Moderator@123',
      name: 'Jane Moderator',
      role: 'MODERATOR',
      isActive: true
    });

    const support = await AdminUser.create({
      email: 'support@swarnabindu.com',
      password: 'Support@123',
      name: 'Support Staff',
      role: 'SUPPORT',
      isActive: true
    });
    console.log(`✅ Seeded 3 Admin Accounts (SUPER_ADMIN, MODERATOR, SUPPORT).`);

    // ── 4. CLIENT USERS ────────────────────────────────────────

    // USER 1: Fully APPROVED + Active scheme subscriber
    const johnUser = await User.create({
      mobileNumber: '+919876543210',
      isVerified: true,
      kycStatus: 'APPROVED',
      deviceToken: 'fcm_john_device_token_dev',
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
          aadhaarFront: '/uploads/kyc/aadhaar_front.png',
          aadhaarBack: '/uploads/kyc/aadhaar_back.png',
          panNumber: 'ABCDE1234F',
          panCardPhoto: '/uploads/kyc/pan.png',
          digiLockerConnected: true
        },
        addressInfo: {
          houseName: 'Green Villa',
          street: 'MG Road',
          city: 'Kochi',
          district: 'Ernakulam',
          state: 'Kerala',
          pinCode: '682001',
          locationCoordinates: { type: 'Point', coordinates: [76.2999, 9.9816] }
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
          selfiePath: '/uploads/selfies/john_selfie.png',
          capturedAt: new Date('2026-06-01T10:00:00Z')
        },
        moderatedBy: moderator._id,
        moderatedAt: new Date('2026-06-02T09:00:00Z')
      }
    });

    // USER 2: APPROVED + Elite scheme subscriber
    const prashaUser = await User.create({
      mobileNumber: '+919444333222',
      isVerified: true,
      kycStatus: 'APPROVED',
      deviceToken: 'fcm_prasha_device_token_dev',
      kycDetails: {
        personalInfo: {
          fullName: 'Prasha Nair',
          dob: new Date('1988-03-22'),
          gender: 'Female',
          email: 'prasha.nair@gmail.com',
          profilePicture: '/uploads/profiles/profile.png'
        },
        identityVerification: {
          aadhaarNumber: '456789012345',
          aadhaarFront: '/uploads/kyc/aadhaar_front.png',
          aadhaarBack: '/uploads/kyc/aadhaar_back.png',
          panNumber: 'PQRST5678G',
          panCardPhoto: '/uploads/kyc/pan.png',
          digiLockerConnected: false
        },
        addressInfo: {
          houseName: 'Sea View Apartments, Flat 4B',
          street: 'Beach Road',
          city: 'Thiruvananthapuram',
          district: 'Thiruvananthapuram',
          state: 'Kerala',
          pinCode: '695001'
        },
        bankDetails: {
          accountHolderName: 'Prasha Nair',
          bankName: 'SBI',
          accountNumber: '20123456789',
          ifscCode: 'SBIN0001234',
          branchName: 'Statue Branch, TVM',
          upiId: 'prasha@oksbi'
        },
        selfieVerification: {
          selfiePath: '/uploads/selfies/prasha_selfie.png',
          capturedAt: new Date('2026-06-10T11:00:00Z')
        },
        moderatedBy: superAdmin._id,
        moderatedAt: new Date('2026-06-11T09:00:00Z')
      }
    });

    // USER 3: KYC SUBMITTED — Awaiting admin review
    const sarahUser = await User.create({
      mobileNumber: '+919123456789',
      isVerified: true,
      kycStatus: 'SUBMITTED',
      deviceToken: 'fcm_sarah_device_token_dev',
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
          aadhaarFront: '/uploads/kyc/aadhaar_front.png',
          aadhaarBack: '/uploads/kyc/aadhaar_back.png',
          panNumber: 'WXYZP9876Q',
          panCardPhoto: '/uploads/kyc/pan.png',
          digiLockerConnected: false
        },
        addressInfo: {
          houseName: 'Sector 4',
          street: 'Cyber Highway',
          city: 'Bangalore',
          district: 'Bangalore Urban',
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
          selfiePath: '/uploads/selfies/sarah_selfie.png',
          capturedAt: new Date()
        }
      }
    });

    // USER 4: KYC REJECTED — Needs to re-upload
    const raviUser = await User.create({
      mobileNumber: '+917788990011',
      isVerified: true,
      kycStatus: 'REJECTED',
      kycDetails: {
        personalInfo: {
          fullName: 'Ravi Shankar',
          dob: new Date('2000-07-04'),
          gender: 'Male',
          email: 'ravi.shankar@yahoo.com',
          profilePicture: '/uploads/profiles/profile.png'
        },
        identityVerification: {
          aadhaarNumber: '111222333444',
          aadhaarFront: '/uploads/kyc/aadhaar_front.png',
          aadhaarBack: '/uploads/kyc/aadhaar_back.png',
          panNumber: 'LMNOP1234R',
          panCardPhoto: '/uploads/kyc/pan.png',
          digiLockerConnected: false
        },
        addressInfo: {
          houseName: '12, Gandhi Nagar',
          street: 'Main Street',
          city: 'Chennai',
          district: 'Chennai',
          state: 'Tamil Nadu',
          pinCode: '600001'
        },
        bankDetails: {
          accountHolderName: 'Ravi Shankar',
          bankName: 'Canara Bank',
          accountNumber: '1234567890123',
          ifscCode: 'CNRB0001234',
          branchName: 'T. Nagar Branch',
          upiId: 'ravi@okhdfcbank'
        },
        selfieVerification: {
          selfiePath: '/uploads/selfies/ravi_selfie.png',
          capturedAt: new Date('2026-07-01T09:00:00Z')
        },
        rejectedReason: 'PAN card photo is blurry. Please re-upload a clear, high-resolution image.',
        moderatedBy: moderator._id,
        moderatedAt: new Date('2026-07-02T10:00:00Z')
      }
    });

    // USER 5: PENDING — Fresh sign-up, no KYC started
    const newUser = await User.create({
      mobileNumber: '+919000111222',
      isVerified: true,
      kycStatus: 'PENDING',
      deviceToken: 'fcm_new_user_device_token_dev'
    });

    console.log(`✅ Seeded 5 Client Users:`);
    console.log(`   +919876543210  John Mathew     → KYC: APPROVED`);
    console.log(`   +919444333222  Prasha Nair     → KYC: APPROVED`);
    console.log(`   +919123456789  Sarah Connor    → KYC: SUBMITTED`);
    console.log(`   +917788990011  Ravi Shankar    → KYC: REJECTED`);
    console.log(`   +919000111222  (New User)      → KYC: PENDING`);

    // ── 5. USER SCHEME SUBSCRIPTIONS ──────────────────────────

    // John — Active Popular scheme (1 installment paid, 10 remaining)
    const johnPopularSub = await UserScheme.create({
      userId: johnUser._id,
      schemeId: popularScheme._id,
      monthlyInvestment: 5000,
      goldAccumulated: 0.714,
      totalPaid: 5000,
      status: 'ACTIVE',
      startDate: new Date('2026-06-08'),
      endDate: new Date('2027-05-08'),
      goalGoldGram: 10
    });

    // John — Completed & Redeemed Starter scheme (historical)
    const johnRedeemedSub = await UserScheme.create({
      userId: johnUser._id,
      schemeId: starterScheme._id,
      monthlyInvestment: 2000,
      goldAccumulated: 0,
      totalPaid: 22000,
      status: 'REDEEMED',
      startDate: new Date('2025-05-01'),
      endDate: new Date('2026-04-01'),
      goalGoldGram: 4,
      redeemedAt: new Date('2026-04-05T11:00:00Z'),
      redeemedGoldGram: 3.8,
      redeemedValue: 25574
    });

    // Prasha — Active Elite scheme (3 installments paid, 8 remaining)
    const prashaEliteSub = await UserScheme.create({
      userId: prashaUser._id,
      schemeId: eliteScheme._id,
      monthlyInvestment: 10000,
      goldAccumulated: 4.285,
      totalPaid: 30000,
      status: 'ACTIVE',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2027-04-01'),
      goalGoldGram: 20
    });

    console.log(`✅ Seeded 3 Scheme Subscriptions (John: 2 subs, Prasha: 1 sub).`);

    // ── 6. PAYMENT HISTORY ────────────────────────────────────

    // John — 1 Successful (Popular Scheme)
    await Payment.create({
      userId: johnUser._id,
      userSchemeId: johnPopularSub._id,
      transactionId: 'TXN918273645',
      invoiceNo: 'INV-2026-1001',
      razorpayOrderId: 'order_mock_john_01',
      amount: 5000,
      goldGained: 0.714,
      paidAt: new Date('2026-06-08T12:00:00Z'),
      paymentMethod: 'UPI - Google Pay',
      status: 'SUCCESSFUL',
      installmentType: 'CURRENT_MONTH'
    });

    // John — 1 Pending (can be used to test reconcile)
    await Payment.create({
      userId: johnUser._id,
      userSchemeId: johnPopularSub._id,
      razorpayOrderId: 'order_mock_pending_reconcile',
      amount: 5000,
      status: 'PENDING',
      installmentType: 'CURRENT_MONTH'
    });

    // Prasha — 3 Successful (Elite Scheme) — simulating 3 months paid
    const prashaPayments = [
      { month: '2026-05', invoiceSuffix: '1002', txn: 'TXN300000001', orderId: 'order_mock_prasha_01', date: '2026-05-01' },
      { month: '2026-06', invoiceSuffix: '1003', txn: 'TXN300000002', orderId: 'order_mock_prasha_02', date: '2026-06-01' },
      { month: '2026-07', invoiceSuffix: '1004', txn: 'TXN300000003', orderId: 'order_mock_prasha_03', date: '2026-07-01' }
    ];
    for (const p of prashaPayments) {
      await Payment.create({
        userId: prashaUser._id,
        userSchemeId: prashaEliteSub._id,
        transactionId: p.txn,
        invoiceNo: `INV-2026-${p.invoiceSuffix}`,
        razorpayOrderId: p.orderId,
        amount: 10000,
        goldGained: 1.4285,
        paidAt: new Date(`${p.date}T10:00:00Z`),
        paymentMethod: 'UPI - PhonePe',
        status: 'SUCCESSFUL',
        installmentType: 'CURRENT_MONTH'
      });
    }

    // John — Redeemed Starter payments (all 11 months)
    for (let i = 0; i < 11; i++) {
      const month = String(5 + i).padStart(2, '0');
      const yr = i < 8 ? '2025' : '2026';
      const mo = i < 8 ? String(5 + i).padStart(2, '0') : String((i - 7)).padStart(2, '0');
      await Payment.create({
        userId: johnUser._id,
        userSchemeId: johnRedeemedSub._id,
        transactionId: `TXN100000${10 + i}`,
        invoiceNo: `INV-2025-20${10 + i}`,
        razorpayOrderId: `order_mock_redeemed_${i + 1}`,
        amount: 2000,
        goldGained: 0.3455,
        paidAt: new Date(`${yr}-${mo}-05T10:00:00Z`),
        paymentMethod: 'UPI - Google Pay',
        status: 'SUCCESSFUL',
        installmentType: 'CURRENT_MONTH'
      });
    }

    console.log(`✅ Seeded Payment History (John: 2 + 11, Prasha: 3 payments).`);

    // ── 7. NOTIFICATIONS ──────────────────────────────────────
    await Notification.insertMany([
      {
        userId: johnUser._id,
        title: 'KYC Approved! 🎉',
        message: 'Your KYC verification is approved. You can now subscribe to gold schemes.',
        type: 'KYC_STATUS',
        isRead: true
      },
      {
        userId: johnUser._id,
        title: 'Gold Purchased Successfully',
        message: 'You purchased 0.714 g of gold for ₹5,000. Keep saving!',
        type: 'GOLD_PURCHASE',
        isRead: true
      },
      {
        userId: johnUser._id,
        title: 'Installment Reminder 🔔',
        message: 'Your next installment of ₹5,000 for Swarna Bindu Popular is due on Aug 8, 2026.',
        type: 'PAYMENT_REMINDER',
        isRead: false
      },
      {
        userId: prashaUser._id,
        title: 'KYC Approved! 🎉',
        message: 'Your KYC has been verified. Welcome to Swarna Bindu Gold Scheme!',
        type: 'KYC_STATUS',
        isRead: true
      },
      {
        userId: prashaUser._id,
        title: 'Gold Purchased Successfully',
        message: 'You purchased 1.4285 g of gold for ₹10,000. Great progress!',
        type: 'GOLD_PURCHASE',
        isRead: false
      },
      {
        userId: sarahUser._id,
        title: 'KYC Under Review',
        message: 'Your KYC documents have been submitted and are under review. We will notify you within 48 hours.',
        type: 'KYC_STATUS',
        isRead: false
      },
      {
        userId: raviUser._id,
        title: 'KYC Rejected ⚠️',
        message: 'Your KYC was rejected: PAN card photo is blurry. Please re-upload.',
        type: 'KYC_STATUS',
        isRead: false
      }
    ]);
    console.log(`✅ Seeded 7 Notifications.`);

    // ── 8. CONSENTS ───────────────────────────────────────────
    await Consent.insertMany([
      {
        userId: johnUser._id,
        consentType: 'KYC',
        purpose: 'Identity verification for gold savings scheme',
        consentText: 'I hereby authorize Swarna Bindu to collect and verify my KYC documents including Aadhaar, PAN, and bank details for the purpose of gold scheme subscription.',
        ipAddress: '192.168.1.100',
        userAgent: 'Flutter/Android 14'
      },
      {
        userId: johnUser._id,
        consentType: 'BIOMETRIC',
        purpose: 'Selfie-based liveness verification',
        consentText: 'I authorize Swarna Bindu to capture and temporarily store my selfie for identity verification. The biometric data will be deleted after the retention period.',
        ipAddress: '192.168.1.100',
        userAgent: 'Flutter/Android 14'
      },
      {
        userId: prashaUser._id,
        consentType: 'KYC',
        purpose: 'Identity verification for gold savings scheme',
        consentText: 'I hereby authorize Swarna Bindu to collect and verify my KYC documents for scheme subscription.',
        ipAddress: '10.0.0.55',
        userAgent: 'Flutter/iOS 17'
      },
      {
        userId: prashaUser._id,
        consentType: 'MARKETING',
        purpose: 'Marketing and promotional communications',
        consentText: 'I agree to receive marketing communications from Swarna Bindu via SMS and push notifications.',
        ipAddress: '10.0.0.55',
        userAgent: 'Flutter/iOS 17'
      },
      {
        userId: sarahUser._id,
        consentType: 'KYC',
        purpose: 'Identity verification for gold savings scheme',
        consentText: 'I authorize Swarna Bindu to collect and verify my KYC documents.',
        ipAddress: '172.16.0.22',
        userAgent: 'Flutter/Android 13'
      }
    ]);
    console.log(`✅ Seeded 5 Consent Records.`);

    // ── DONE ──────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(65));
    console.log('  🌿 DATABASE SEEDING COMPLETE — DEVELOPMENT CREDENTIALS');
    console.log('═'.repeat(65));

    console.log('\n  📱 CLIENT USERS (use OTP: 123456 for all in MOCK_MODE)');
    console.log('  ┌─────────────────────┬──────────────────┬────────────────┐');
    console.log('  │ Mobile              │ Name             │ KYC Status     │');
    console.log('  ├─────────────────────┼──────────────────┼────────────────┤');
    console.log('  │ +919876543210       │ John Mathew      │ APPROVED ✅    │');
    console.log('  │ +919444333222       │ Prasha Nair      │ APPROVED ✅    │');
    console.log('  │ +919123456789       │ Sarah Connor     │ SUBMITTED ⏳   │');
    console.log('  │ +917788990011       │ Ravi Shankar     │ REJECTED ❌    │');
    console.log('  │ +919000111222       │ (New User)       │ PENDING 🔄     │');
    console.log('  └─────────────────────┴──────────────────┴────────────────┘');

    console.log('\n  🛡️  ADMIN ACCOUNTS');
    console.log('  ┌───────────────────────────────┬──────────────────┬─────────────┐');
    console.log('  │ Email                         │ Password         │ Role        │');
    console.log('  ├───────────────────────────────┼──────────────────┼─────────────┤');
    console.log('  │ admin@swarnabindu.com         │ Admin@123        │ SUPER_ADMIN │');
    console.log('  │ moderator@swarnabindu.com     │ Moderator@123    │ MODERATOR   │');
    console.log('  │ support@swarnabindu.com       │ Support@123      │ SUPPORT     │');
    console.log('  └───────────────────────────────┴──────────────────┴─────────────┘');

    console.log('\n  📦 SCHEME SUBSCRIPTIONS');
    console.log('  ┌──────────────────┬──────────────────────┬────────────────┐');
    console.log('  │ User             │ Scheme               │ Status         │');
    console.log('  ├──────────────────┼──────────────────────┼────────────────┤');
    console.log('  │ John Mathew      │ Swarna Bindu Popular │ ACTIVE         │');
    console.log('  │ John Mathew      │ Swarna Bindu Starter │ REDEEMED       │');
    console.log('  │ Prasha Nair      │ Swarna Bindu Elite   │ ACTIVE         │');
    console.log('  └──────────────────┴──────────────────────┴────────────────┘');

    console.log('\n  💳 PAYMENT HIGHLIGHTS');
    console.log('  • John: 1 SUCCESSFUL (Popular) + 1 PENDING (reconcilable test)');
    console.log('  • Prasha: 3 SUCCESSFUL (Elite, ₹10k/month)');
    console.log('  • John: 11 SUCCESSFUL (Starter, fully paid — historical)');

    console.log('\n  💰 GOLD RATE');
    console.log(`  • 22K = ₹${goldRateData.rate22K_per_g}/g | 24K (8g) = ₹${goldRateData.rate24K_per_8g}`);
    console.log('═'.repeat(65) + '\n');

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Seeding failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

seedDatabase();
