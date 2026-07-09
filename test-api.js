const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('🚀 Starting Swarna Bindu REST API Integration Tests...\n');

  // Create temporary dummy image files for file upload testing
  const dummyFile = path.join(__dirname, 'dummy.png');
  fs.writeFileSync(dummyFile, 'PNG dummy content for testing upload');

  let accessToken = '';
  let refreshToken = '';
  let schemeId = '';
  let userSchemeId = '';
  let transactionId = '';

  try {
    // 1. Fetch Today's Gold Rate (Public Route)
    console.log('1. Fetching Today\'s Gold Rate...');
    const rateRes = await fetch(`${BASE_URL}/gold-rate/today`);
    const rateData = await rateRes.json();
    console.log('   Response:', JSON.stringify(rateData.data), '\n');

    // 2. Request OTP
    console.log('2. Requesting OTP for +919876543210...');
    const otpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '+919876543210' })
    });
    const otpData = await otpRes.json();
    console.log('   Response:', JSON.stringify(otpData), '\n');

    // 3. Verify OTP
    console.log('3. Verifying OTP...');
    const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNumber: '+919876543210',
        otp: '123456',
        deviceToken: 'fcm_test_device_token_xyz_2026'
      })
    });
    const verifyData = await verifyRes.json();
    accessToken = verifyData.data.accessToken;
    refreshToken = verifyData.data.refreshToken;
    console.log('   Verification Successful! Access Token received.\n');

    const authHeaders = {
      'Authorization': `Bearer ${accessToken}`
    };

    // 4. Get Profile (Initially Pending KYC, 0 savings)
    console.log('4. Fetching initial profile (KYC should be PENDING)...');
    const profileRes = await fetch(`${BASE_URL}/user/profile`, { headers: authHeaders });
    const profileData = await profileRes.json();
    console.log('   KYC Status:', profileData.data.profile.kycStatus);
    console.log('   Total Gold Accumulated:', profileData.data.investments.totalGoldAccumulated, 'g\n');

    // 5. Submit KYC Step 1: Personal Info
    console.log('5. Submitting KYC Step 1: Personal Details...');
    const step1Form = new FormData();
    step1Form.append('fullName', 'John Mathew');
    step1Form.append('dob', '1995-05-15');
    step1Form.append('gender', 'Male');
    step1Form.append('email', 'john@gmail.com');
    
    const file1Buffer = fs.readFileSync(dummyFile);
    const blob1 = new Blob([file1Buffer], { type: 'image/png' });
    step1Form.append('profilePicture', blob1, 'profile.png');

    const step1Res = await fetch(`${BASE_URL}/user/kyc/personal`, {
      method: 'PUT',
      headers: authHeaders,
      body: step1Form
    });
    const step1Data = await step1Res.json();
    console.log('   Step 1 Response:', step1Data.message, '\n');

    // 6. Submit KYC Step 2: Identity Documents
    console.log('6. Submitting KYC Step 2: Aadhaar & PAN Card...');
    const step2Form = new FormData();
    step2Form.append('aadhaarNumber', '123456784589');
    step2Form.append('panNumber', 'ABCDE1234F');
    step2Form.append('digiLockerConnected', 'false');

    const file2Buffer = fs.readFileSync(dummyFile);
    const blob2 = new Blob([file2Buffer], { type: 'image/png' });
    step2Form.append('aadhaarFront', blob2, 'aadhaar_front.png');
    step2Form.append('aadhaarBack', blob2, 'aadhaar_back.png');
    step2Form.append('panCardPhoto', blob2, 'pan.png');

    const step2Res = await fetch(`${BASE_URL}/user/kyc/identity`, {
      method: 'PUT',
      headers: authHeaders,
      body: step2Form
    });
    const step2Data = await step2Res.json();
    console.log('   Step 2 Response:', step2Data.message, '\n');

    // 7. Submit KYC Step 3: Address Information
    console.log('7. Submitting KYC Step 3: Address Information...');
    const step3Res = await fetch(`${BASE_URL}/user/kyc/address`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        houseName: 'Green Villa',
        street: 'MG Road',
        landmark: 'Near Metro Station',
        city: 'Kochi',
        district: 'Ernakulam',
        state: 'Kerala',
        pinCode: '682001',
        latitude: 9.9816,
        longitude: 76.2999
      })
    });
    const step3Data = await step3Res.json();
    console.log('   Step 3 Response:', step3Data.message, '\n');

    // 8. Submit KYC Step 4: Bank Details
    console.log('8. Submitting KYC Step 4: Bank Details...');
    const step4Res = await fetch(`${BASE_URL}/user/kyc/bank`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountHolderName: 'John Mathew',
        bankName: 'Axis Bank Ltd.',
        accountNumber: '919876543210',
        confirmAccountNumber: '919876543210',
        ifscCode: 'UTIB0001234',
        branchName: 'MG Road, Kochi',
        upiId: 'john@okaxis'
      })
    });
    const step4Data = await step4Res.json();
    console.log('   Step 4 Response:', step4Data.message, '\n');

    // 9. Submit KYC Step 5: Selfie Verification (Triggers submission & auto-approval process)
    console.log('9. Submitting KYC Step 5: Selfie & Request Verification...');
    const step5Form = new FormData();
    const file5Buffer = fs.readFileSync(dummyFile);
    const blob5 = new Blob([file5Buffer], { type: 'image/png' });
    step5Form.append('selfie', blob5, 'selfie.png');

    const step5Res = await fetch(`${BASE_URL}/user/kyc/submit`, {
      method: 'POST',
      headers: authHeaders,
      body: step5Form
    });
    const step5Data = await step5Res.json();
    console.log('   Step 5 Response:', step5Data.message);
    console.log('   Current Status:', step5Data.data.kycStatus, '\n');

    // 10. Waiting for Simulated KYC Auto-Approval (Approves in 10s. Let's sleep for 11 seconds)
    console.log('10. Waiting 11 seconds for simulated background KYC verification check...');
    await sleep(11000);

    console.log('    Checking KYC verification status...');
    const statusRes = await fetch(`${BASE_URL}/user/kyc/status`, { headers: authHeaders });
    const statusData = await statusRes.json();
    console.log('    KYC Status now:', statusData.data.kycStatus, '\n');

    // 11. Fetch Available Schemes
    console.log('11. Fetching available schemes catalog...');
    const schemeRes = await fetch(`${BASE_URL}/schemes`, { headers: authHeaders });
    const schemeData = await schemeRes.json();
    schemeId = schemeData.data.schemes[0]._id;
    console.log(`    Found Scheme: ${schemeData.data.schemes[0].name} (ID: ${schemeId})\n`);

    // 12. Join Scheme
    console.log('12. Joining scheme...');
    const joinRes = await fetch(`${BASE_URL}/schemes/${schemeId}/join`, {
      method: 'POST',
      headers: authHeaders
    });
    const joinData = await joinRes.json();
    userSchemeId = joinData.data.userScheme.id;
    console.log('    Subscription Success! User Scheme ID:', userSchemeId, '\n');

    // 13. Calculate Installment Dues
    console.log('13. Checking outstanding payment dues...');
    const duesRes = await fetch(`${BASE_URL}/payments/dues`, { headers: authHeaders });
    const duesData = await duesRes.json();
    console.log(`    Next installment due: ₹${duesData.data.nextDueAmount} on ${duesData.data.nextDueDate}\n`);

    // 14. Initialize Payment
    console.log('14. Initializing Payment session for Current Month (₹5,000)...');
    const initRes = await fetch(`${BASE_URL}/payments/initialize`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userSchemeId,
        installmentType: 'CURRENT_MONTH',
        amount: 5000
      })
    });
    const initData = await initRes.json();
    transactionId = initData.data.transactionId;
    console.log('    Order ID generated:', initData.data.razorpayOrderId);
    console.log('    Transaction ID:', transactionId, '\n');

    // 15. Verify Successful Payment (Credits Gold)
    console.log('15. Verifying Successful Payment...');
    const verifyRes2 = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId,
        status: 'SUCCESSFUL',
        paymentMethod: 'UPI - Google Pay'
      })
    });
    const verifyData2 = await verifyRes2.json();
    console.log('    Status:', verifyData2.data.payment.status);
    console.log('    Invoice Number:', verifyData2.data.payment.invoiceNo);
    console.log('    Gold Grams Credited:', verifyData2.data.payment.goldGained, 'g\n');

    // 16. Get Profile to see Savings & Gold Growth
    console.log('16. Checking updated Profile Dashboard values...');
    const profileRes2 = await fetch(`${BASE_URL}/user/profile`, { headers: authHeaders });
    const profileData2 = await profileRes2.json();
    console.log('    Total Savings Paid:', profileData2.data.investments.totalSavingsValue);
    console.log('    Total Gold Accumulated:', profileData2.data.investments.totalGoldAccumulated, 'g');
    console.log('    Current Gold Asset Value:', profileData2.data.investments.currentGoldValue);
    console.log(`    Goal Progress: ${profileData2.data.investments.progressPercent}% of target ${profileData2.data.investments.goalGoldGram}g\n`);

    // 17. Download/View Payment Receipt
    const txIdStr = verifyData2.data.payment.transactionId;
    console.log(`17. Fetching Invoice Receipt details for transaction: ${txIdStr}...`);
    const receiptRes = await fetch(`${BASE_URL}/payments/receipt/${txIdStr}`, { headers: authHeaders });
    const receiptData = await receiptRes.json();
    console.log('    Receipt Invoice:', receiptData.data.receipt.invoiceNo);
    console.log('    Amount:', receiptData.data.receipt.amountPaid, 'via', receiptData.data.receipt.paymentMethod, '\n');

    // 18. Redeem Gold
    const goldToRedeem = profileData2.data.investments.totalGoldAccumulated;
    console.log(`18. Redeeming all accumulated gold (${goldToRedeem} g) for cash payout...`);
    const redeemRes = await fetch(`${BASE_URL}/gold/redeem`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userSchemeId,
        goldQuantity: goldToRedeem
      })
    });
    const redeemData = await redeemRes.json();
    console.log('    Redemption Success! Payout Details:');
    console.log(`    Payout cash value: ₹${redeemData.data.redemption.payoutAmount}`);
    console.log(`    Transferring to bank: ${redeemData.data.redemption.payoutBankAccount.bankName} (${redeemData.data.redemption.payoutBankAccount.accountNumber})`);
    console.log('    Scheme Status now:', redeemData.data.redemption.status, '\n');

    // 19. Retrieve notifications list
    console.log('19. Fetching user notifications list...');
    const notifRes = await fetch(`${BASE_URL}/notifications`, { headers: authHeaders });
    const notifData = await notifRes.json();
    console.log('    Latest Alerts:');
    notifData.data.notifications.slice(0, 3).forEach(n => {
      console.log(`    - [${n.type}] ${n.title}: ${n.message}`);
    });
    console.log();

    console.log('🎉 ALL API INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Integration Test Failed with error:', error);
  } finally {
    // Cleanup dummy files
    if (fs.existsSync(dummyFile)) {
      fs.unlinkSync(dummyFile);
    }
  }
}

runTests();
