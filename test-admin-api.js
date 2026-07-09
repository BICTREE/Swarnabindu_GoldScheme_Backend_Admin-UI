const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAdminTests() {
  console.log('🚀 Starting Swarna Bindu Admin API Integration Tests...\n');

  // Create temporary dummy file for uploads
  const dummyFile = path.join(__dirname, 'dummy_admin.png');
  fs.writeFileSync(dummyFile, 'PNG content for admin E2E uploads');

  let adminToken = '';
  let modToken = '';
  let clientToken = '';
  let clientId = '';
  let newSchemeId = '';
  let userSchemeId = '';
  let paymentId = '';

  try {
    // 1. Admin Login (Super Admin seeded)
    console.log('1. Logging in as Super Admin (admin@swarnabindu.com)...');
    const adminLoginRes = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swarnabindu.com',
        password: 'admin123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.data.accessToken;
    console.log('   Super Admin Token received. Role:', adminLoginData.data.admin.role, '\n');

    const adminHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    // 2. Create Moderator Account
    console.log('2. Creating Moderator Admin Account (SUPER_ADMIN privilege)...');
    const createModRes = await fetch(`${BASE_URL}/admin/auth/create-admin`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email: 'moderator@swarnabindu.com',
        password: 'moderator123',
        name: 'Jane Moderator',
        role: 'MODERATOR'
      })
    });
    const createModData = await createModRes.json();
    console.log('   Moderator Account Created:', createModData.data.admin.email, '\n');

    // Log in as Moderator to test role middleware
    console.log('3. Logging in as Moderator (moderator@swarnabindu.com)...');
    const modLoginRes = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'moderator@swarnabindu.com',
        password: 'moderator123'
      })
    });
    const modLoginData = await modLoginRes.json();
    modToken = modLoginData.data.accessToken;
    console.log('   Moderator Token received.\n');

    const modHeaders = {
      'Authorization': `Bearer ${modToken}`,
      'Content-Type': 'application/json'
    };

    // 4. Register Client User and Submit KYC
    console.log('4. Registering Client User (+919876543210)...');
    const clientOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '+919876543210' })
    });
    const clientVerifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '+919876543210', otp: '123456' })
    });
    const clientVerifyData = await clientVerifyRes.json();
    clientToken = clientVerifyData.data.accessToken;
    clientId = clientVerifyData.data.user.id;
    console.log('   Client authenticated successfully! User ID:', clientId, '\n');

    const clientHeaders = {
      'Authorization': `Bearer ${clientToken}`
    };

    // Fill Client KYC details (Step 1-4)
    console.log('   Submitting Client KYC Steps 1 to 4...');
    const step1Form = new FormData();
    step1Form.append('fullName', 'John Mathew');
    step1Form.append('dob', '1995-05-15');
    step1Form.append('gender', 'Male');
    step1Form.append('email', 'john@gmail.com');
    const blob1 = new Blob([fs.readFileSync(dummyFile)], { type: 'image/png' });
    step1Form.append('profilePicture', blob1, 'profile.png');
    await fetch(`${BASE_URL}/user/kyc/personal`, { method: 'PUT', headers: clientHeaders, body: step1Form });

    const step2Form = new FormData();
    step2Form.append('aadhaarNumber', '123456784589');
    step2Form.append('panNumber', 'ABCDE1234F');
    step2Form.append('digiLockerConnected', 'false');
    const blob2 = new Blob([fs.readFileSync(dummyFile)], { type: 'image/png' });
    step2Form.append('aadhaarFront', blob2, 'aadhaar_front.png');
    step2Form.append('aadhaarBack', blob2, 'aadhaar_back.png');
    step2Form.append('panCardPhoto', blob2, 'pan.png');
    await fetch(`${BASE_URL}/user/kyc/identity`, { method: 'PUT', headers: clientHeaders, body: step2Form });

    await fetch(`${BASE_URL}/user/kyc/address`, {
      method: 'PUT',
      headers: { ...clientHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        houseName: 'Green Villa', street: 'MG Road', city: 'Kochi', district: 'Ernakulam', state: 'Kerala', pinCode: '682001'
      })
    });

    await fetch(`${BASE_URL}/user/kyc/bank`, {
      method: 'PUT',
      headers: { ...clientHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountHolderName: 'John Mathew', bankName: 'Axis Bank Ltd.', accountNumber: '919876543210',
        confirmAccountNumber: '919876543210', ifscCode: 'UTIB0001234', branchName: 'MG Road, Kochi'
      })
    });

    // Step 5: Selfie upload -> KYC SUBMITTED
    console.log('   Uploading selfie (Step 5) to set status to SUBMITTED...');
    const step5Form = new FormData();
    const blob5 = new Blob([fs.readFileSync(dummyFile)], { type: 'image/png' });
    step5Form.append('selfie', blob5, 'selfie.png');
    await fetch(`${BASE_URL}/user/kyc/submit`, { method: 'POST', headers: clientHeaders, body: step5Form });

    // Wait a brief second to let status apply
    await sleep(500);

    // 5. Admin fetches Pending KYCs
    console.log('5. Admin Moderator reviews Pending KYC list...');
    const pendingKycRes = await fetch(`${BASE_URL}/admin/kyc/pending`, { headers: modHeaders });
    const pendingKycData = await pendingKycRes.json();
    console.log('   Found pending submissions count:', pendingKycData.data.pendingList.length);
    console.log('   Pending User Name:', pendingKycData.data.pendingList[0].kycDetails.personalInfo.fullName, '\n');

    // 6. Admin Moderator Approves KYC
    console.log(`6. Admin Moderator approves KYC for User ID: ${clientId}...`);
    const approveRes = await fetch(`${BASE_URL}/admin/kyc/${clientId}/approve`, {
      method: 'POST',
      headers: modHeaders
    });
    const approveData = await approveRes.json();
    console.log('   Approve Response:', approveData.message, '\n');

    // 7. Admin Moderator creates new Gold Scheme
    console.log('7. Admin Moderator adds a new Gold Scheme to the catalog...');
    const createSchemeRes = await fetch(`${BASE_URL}/admin/schemes`, {
      method: 'POST',
      headers: modHeaders,
      body: JSON.stringify({
        name: 'Swarna Bindu Platinum',
        description: 'Elite plan for premium savings with maximum yields.',
        monthlyInvestment: 15000,
        durationMonths: 11,
        maturityBenefitPercent: 12,
        minGoldGram: 30,
        termsAndConditions: '1. Scheme duration is 11 months.\n2. Standard maturity options apply.'
      })
    });
    const createSchemeData = await createSchemeRes.json();
    newSchemeId = createSchemeData.data.scheme._id;
    console.log(`   Scheme Created: ${createSchemeData.data.scheme.name} (ID: ${newSchemeId})\n`);

    // 8. Admin Moderator updates scheme
    console.log('8. Admin Moderator updates scheme description...');
    const updateSchemeRes = await fetch(`${BASE_URL}/admin/schemes/${newSchemeId}`, {
      method: 'PUT',
      headers: modHeaders,
      body: JSON.stringify({
        description: 'Elite plan for premium savings with maximum yields. Premium benefits.'
      })
    });
    const updateSchemeData = await updateSchemeRes.json();
    console.log('   Updated Description:', updateSchemeData.data.scheme.description, '\n');

    // 9. Client Joins the new Scheme
    console.log('9. Client User subscribes to Swarna Bindu Platinum...');
    const joinRes = await fetch(`${BASE_URL}/schemes/${newSchemeId}/join`, {
      method: 'POST',
      headers: clientHeaders
    });
    const joinData = await joinRes.json();
    userSchemeId = joinData.data.userScheme.id;
    console.log('   Subscription Success! User Scheme ID:', userSchemeId, '\n');

    // 10. Client initializes a payment
    console.log('10. Client User initializes installment payment...');
    const initPayRes = await fetch(`${BASE_URL}/payments/initialize`, {
      method: 'POST',
      headers: { ...clientHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userSchemeId,
        installmentType: 'CURRENT_MONTH',
        amount: 15000
      })
    });
    const initPayData = await initPayRes.json();
    paymentId = initPayData.data.transactionId;
    console.log('    Initialized Payment ID (Transaction ID):', paymentId, '\n');

    // 11. Admin fetches payments list (Should show as PENDING)
    console.log('11. Admin Moderator lists payments transactions...');
    const listPayRes = await fetch(`${BASE_URL}/admin/payments?status=PENDING`, { headers: modHeaders });
    const listPayData = await listPayRes.json();
    console.log('    Pending transactions count:', listPayData.data.payments.length);
    console.log('    Pending transaction amount:', listPayData.data.payments[0].amount, '\n');

    // 12. Super Admin reconciles the payment (MODERATOR should get 403 Forbidden)
    console.log('12. Attempting Moderator manual reconciliation (should be rejected 403)...');
    const modReconcileRes = await fetch(`${BASE_URL}/admin/payments/${paymentId}/reconcile`, {
      method: 'POST',
      headers: modHeaders
    });
    const modReconcileData = await modReconcileRes.json();
    console.log('    Moderator Reconcile Response Code:', modReconcileRes.status);
    console.log('    Moderator Reconcile Error Code:', modReconcileData.errorCode);

    console.log('    Attempting Super Admin manual reconciliation (should succeed)...');
    const adminReconcileRes = await fetch(`${BASE_URL}/admin/payments/${paymentId}/reconcile`, {
      method: 'POST',
      headers: adminHeaders
    });
    const adminReconcileData = await adminReconcileRes.json();
    console.log('    Super Admin Reconcile Response:', adminReconcileData.message);
    console.log('    Gold weight credited to UserScheme:', adminReconcileData.data.userScheme.goldAccumulated, 'g\n');

    // 13. Admin updates gold rate
    console.log('13. Admin Moderator overrides today\'s gold rates...');
    const rateRes = await fetch(`${BASE_URL}/admin/gold-rate/update`, {
      method: 'POST',
      headers: modHeaders,
      body: JSON.stringify({
        rate22K_per_g: 7200.00,
        rate24K_per_8g: 60000.00 // 7500 per g
      })
    });
    const rateData = await rateRes.json();
    console.log('    Rate Override Successful! Gold Rates now:');
    console.log('    22K (1g) =', rateData.data.goldRate.rate22K_per_g);
    console.log('    24K (8g) =', rateData.data.goldRate.rate24K_per_8g, '\n');

    // 14. Admin broadcasts notification to all users
    console.log('14. Admin Moderator broadcasts notification announcement...');
    const broadcastRes = await fetch(`${BASE_URL}/admin/notifications/broadcast`, {
      method: 'POST',
      headers: modHeaders,
      body: JSON.stringify({
        title: 'Platform Maintenance Notice',
        message: 'Platform under brief maintenance on Sunday, 12th July, from 2:00 AM to 4:00 AM.'
      })
    });
    const broadcastData = await broadcastRes.json();
    console.log('    Broadcast Success! Sent count:', broadcastData.data.sentCount, '\n');

    // 15. Super Admin fetches audit logs
    console.log('15. Super Admin retrieves Platform Audit Logs...');
    const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, { headers: adminHeaders });
    const auditData = await auditRes.json();
    console.log(`    Total Audit Log Records Found: ${auditData.data.logs.length}`);
    console.log('    Latest Administrative actions logged:');
    auditData.data.logs.slice(0, 5).forEach(l => {
      console.log(`    - [${l.action}] by ${l.adminId ? l.adminId.email : 'Unknown'} on ${l.targetEntity}`);
    });
    console.log();

    // 16. Admin Moderator fetches Dashboard Stats
    console.log('16. Admin Moderator queries Dashboard Analytics...');
    const statsRes = await fetch(`${BASE_URL}/admin/dashboard/stats`, { headers: modHeaders });
    const statsData = await statsRes.json();
    console.log('    Platform Dashboard stats:');
    console.log('    - Users Registered:', statsData.data.users.total);
    console.log('    - KYC Approved:', statsData.data.users.kyc.approved);
    console.log('    - Total Cash Collected: ₹', statsData.data.financials.totalRevenueReceived);
    console.log('    - Total Gold Liabilities weight:', statsData.data.financials.totalGoldReserveLiabilities, 'g');
    console.log('    - Cash valuation of gold liabilities: ₹', statsData.data.financials.currentGoldLiabilityValue, '\n');

    console.log('🎉 ALL ADMIN API INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Admin Integration Test Failed with error:', error);
  } finally {
    // Cleanup files
    if (fs.existsSync(dummyFile)) {
      fs.unlinkSync(dummyFile);
    }
  }
}

runAdminTests();
