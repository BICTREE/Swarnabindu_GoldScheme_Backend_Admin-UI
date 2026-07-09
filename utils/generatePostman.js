const fs = require('fs');
const path = require('path');

const collection = {
  info: {
    name: 'Swarna Bindu Gold Scheme REST API',
    description: 'A unified API collection for the Swarna Bindu Gold Scheme platform. Organized into separate "Client" and "Admin" flows for development convenience.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5001/api/v1', type: 'string' },
    { key: 'clientToken', value: '', type: 'string' },
    { key: 'adminToken', value: '', type: 'string' },
    { key: 'clientRefreshToken', value: '', type: 'string' }
  ],
  item: []
};

// Helper to create request items
function makeRequest({
  name,
  method,
  path,
  headers = [],
  body = null,
  authType = 'bearer', // 'bearer' or 'none'
  tokenVar = 'clientToken',
  event = [],
  responses = []
}) {
  const headerList = [...headers];
  
  const reqObj = {
    name,
    request: {
      method,
      header: headerList,
      url: {
        raw: `{{baseUrl}}${path}`,
        host: ['{{baseUrl}}'],
        path: path.split('/').filter(p => p)
      }
    },
    response: responses
  };

  if (authType === 'bearer') {
    reqObj.request.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: `{{${tokenVar}}}`, type: 'string' }]
    };
  }

  if (body) {
    if (body.type === 'json') {
      reqObj.request.body = {
        mode: 'raw',
        raw: JSON.stringify(body.data, null, 2),
        options: { raw: { language: 'json' } }
      };
    } else if (body.type === 'form') {
      reqObj.request.body = {
        mode: 'formdata',
        formdata: Object.keys(body.data).map(key => ({
          key,
          value: body.data[key],
          type: 'text'
        }))
      };
    }
  }

  if (event.length > 0) {
    reqObj.event = event;
  }

  return reqObj;
}

// Helpers for mock response examples
function makeResponse({ name, status, code, body }) {
  return {
    name,
    originalRequest: {
      method: 'GET',
      header: [],
      url: { raw: '{{baseUrl}}' }
    },
    status,
    code,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify(body, null, 2)
  };
}

// ==========================================
// 1. CLIENT ROUTE ITEMS
// ==========================================
const clientAuthFolder = {
  name: 'Auth',
  description: 'Authentication endpoints for mobile client users (OTP Send/Verify and refresh flows). Uses {{clientToken}}.',
  item: [
    makeRequest({
      name: '1. Send OTP',
      method: 'POST',
      path: '/auth/send-otp',
      authType: 'none',
      body: { type: 'json', data: { mobileNumber: '+919876543210' } },
      responses: [
        makeResponse({
          name: 'Success - OTP Sent',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'OTP sent successfully to your mobile number', errorCode: null, data: { otpSent: true, expiresInSeconds: 300 } }
        }),
        makeResponse({
          name: 'Validation Error - Invalid Phone',
          status: 'Bad Request',
          code: 400,
          body: { success: false, message: 'Validation Error: "mobileNumber" fails to match required pattern', errorCode: 'VALIDATION_ERROR', data: null }
        })
      ]
    }),
    makeRequest({
      name: '2. Verify OTP',
      method: 'POST',
      path: '/auth/verify-otp',
      authType: 'none',
      body: { type: 'json', data: { mobileNumber: '+919876543210', otp: '123456', deviceToken: 'fcm_client_device_token' } },
      event: [
        {
          listen: 'test',
          script: {
            exec: [
              'const response = pm.response.json();',
              'if (response.success && response.data && response.data.accessToken) {',
              '    pm.collectionVariables.set("clientToken", response.data.accessToken);',
              '    pm.collectionVariables.set("clientRefreshToken", response.data.refreshToken);',
              '}'
            ],
            type: 'text/javascript'
          }
        }
      ],
      responses: [
        makeResponse({
          name: 'Success - Verified Login',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Authentication successful', errorCode: null, data: { user: { id: '60a92b23...', mobileNumber: '+919876543210', kycStatus: 'PENDING' }, accessToken: 'JWT_ACCESS...', refreshToken: 'JWT_REFRESH...' } }
        }),
        makeResponse({
          name: 'Error - Invalid OTP',
          status: 'Bad Request',
          code: 400,
          body: { success: false, message: 'Invalid or expired OTP', errorCode: 'INVALID_OTP', data: null }
        })
      ]
    }),
    makeRequest({
      name: '3. Refresh Token',
      method: 'POST',
      path: '/auth/refresh',
      authType: 'none',
      body: { type: 'json', data: { refreshToken: '{{clientRefreshToken}}' } },
      responses: [
        makeResponse({
          name: 'Success - Token Refreshed',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Access token refreshed successfully', errorCode: null, data: { accessToken: 'NEW_JWT_ACCESS...' } }
        })
      ]
    }),
    makeRequest({
      name: '4. Logout',
      method: 'POST',
      path: '/auth/logout',
      authType: 'none',
      body: { type: 'json', data: { refreshToken: '{{clientRefreshToken}}' } },
      responses: [
        makeResponse({
          name: 'Success - Session Terminated',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Logged out successfully', errorCode: null, data: null }
        })
      ]
    })
  ]
};

const clientProfileFolder = {
  name: 'Profile & KYC',
  description: 'Client profile details, dynamic dashboard savings valuation metrics, and step-by-step KYC submission endpoints. Requires {{clientToken}}.',
  item: [
    makeRequest({
      name: '1. Get Profile & Aggregated Savings',
      method: 'GET',
      path: '/user/profile',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Returns Metrics',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Profile data retrieved successfully', errorCode: null, data: { profile: { id: '609b...', mobileNumber: '+919876543210', kycStatus: 'APPROVED', personalInfo: { fullName: 'John Mathew', email: 'john@gmail.com' } }, investments: { totalSavingsValue: 5000, currentGoldValue: 5012.50, totalGoldAccumulated: 0.716, goalGoldGram: 8.5, progressPercent: 8, nextInstallmentDue: 5000, nextDueDate: '2026-08-05' } } }
        })
      ]
    }),
    makeRequest({
      name: '2. KYC Step 1: Personal Details',
      method: 'PUT',
      path: '/user/kyc/personal',
      authType: 'bearer',
      body: { type: 'form', data: { fullName: 'John Mathew', dob: '1995-05-15', gender: 'Male', email: 'john@gmail.com' } },
      responses: [
        makeResponse({
          name: 'Success - Step 1 Completed',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'KYC Step 1: Personal details updated successfully', errorCode: null, data: { kycStatus: 'PENDING', personalInfo: { fullName: 'John Mathew', dob: '1995-05-15T00:00:00.000Z', gender: 'Male', email: 'john@gmail.com', profilePicture: '/uploads/profiles/profile.png' } } }
        })
      ]
    }),
    makeRequest({
      name: '3. KYC Step 2: Identity Documents',
      method: 'PUT',
      path: '/user/kyc/identity',
      authType: 'bearer',
      body: { type: 'form', data: { aadhaarNumber: '123456784589', panNumber: 'ABCDE1234F', digiLockerConnected: 'false' } },
      responses: [
        makeResponse({
          name: 'Success - Documents Uploaded',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'KYC Step 2: Identity documents updated successfully', errorCode: null, data: { kycStatus: 'PENDING', identityVerification: { aadhaarNumber: '123456784589', panNumber: 'ABCDE1234F', digiLockerConnected: false, aadhaarFront: '/uploads/kyc/front.png', panCardPhoto: '/uploads/kyc/pan.png' } } }
        })
      ]
    }),
    makeRequest({
      name: '4. KYC Step 3: Address Info',
      method: 'PUT',
      path: '/user/kyc/address',
      authType: 'bearer',
      body: { type: 'json', data: { houseName: 'Green Villa', street: 'MG Road', city: 'Kochi', district: 'Ernakulam', state: 'Kerala', pinCode: '682001', latitude: 9.9816, longitude: 76.2999 } },
      responses: [
        makeResponse({
          name: 'Success - Address Saved',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'KYC Step 3: Address information updated successfully', errorCode: null, data: { kycStatus: 'PENDING', addressInfo: { houseName: 'Green Villa', street: 'MG Road', city: 'Kochi', district: 'Ernakulam', state: 'Kerala', pinCode: '682001' } } }
        })
      ]
    }),
    makeRequest({
      name: '5. KYC Step 4: Bank account details',
      method: 'PUT',
      path: '/user/kyc/bank',
      authType: 'bearer',
      body: { type: 'json', data: { accountHolderName: 'John Mathew', bankName: 'Axis Bank Ltd.', accountNumber: '919876543210', confirmAccountNumber: '919876543210', ifscCode: 'UTIB0001234', branchName: 'MG Road, Kochi', upiId: 'john@okaxis' } },
      responses: [
        makeResponse({
          name: 'Success - Bank Setup Saved',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'KYC Step 4: Bank account details updated successfully', errorCode: null, data: { kycStatus: 'PENDING', bankDetails: { bankName: 'Axis Bank Ltd.', accountNumber: '919876543210', ifscCode: 'UTIB0001234' } } }
        })
      ]
    }),
    makeRequest({
      name: '6. KYC Step 5: Upload Selfie & Finalize',
      method: 'POST',
      path: '/user/kyc/submit',
      authType: 'bearer',
      body: { type: 'form', data: {} },
      responses: [
        makeResponse({
          name: 'Success - KYC Submitted',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'KYC documents submitted successfully. Status set to SUBMITTED.', errorCode: null, data: { kycStatus: 'SUBMITTED', selfieDetails: { selfiePath: '/uploads/selfies/selfie.png', capturedAt: '2026-07-08T12:00:00.000Z' } } }
        })
      ]
    }),
    makeRequest({
      name: '7. View KYC Verification Status',
      method: 'GET',
      path: '/user/kyc/status',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Status Output',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'KYC status retrieved', errorCode: null, data: { kycStatus: 'APPROVED', rejectedReason: null } }
        })
      ]
    })
  ]
};

const clientSchemeFolder = {
  name: 'Schemes Catalog',
  description: 'Catalog endpoints for exploring gold schemes and joining/subscribing. Requires APPROVED KYC and {{clientToken}}.',
  item: [
    makeRequest({
      name: '1. List Schemes Catalog',
      method: 'GET',
      path: '/schemes?page=1&limit=10',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Return Schemes List',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Schemes catalog retrieved successfully', errorCode: null, data: { schemes: [{ _id: '608c...', name: 'Swarna Bindu Popular', monthlyInvestment: 5000, durationMonths: 11, maturityBenefitPercent: 8, minGoldGram: 10 }], pagination: { page: 1, limit: 10, total: 3, pages: 1 } } }
        })
      ]
    }),
    makeRequest({
      name: '2. Get Scheme Details',
      method: 'GET',
      path: '/schemes/608c...',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Return Scheme Details',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Scheme details retrieved successfully', errorCode: null, data: { scheme: { _id: '608c...', name: 'Swarna Bindu Popular', description: 'Wealth savings...', termsAndConditions: 'Terms...' } } }
        })
      ]
    }),
    makeRequest({
      name: '3. Subscribe / Join Scheme',
      method: 'POST',
      path: '/schemes/608c.../join',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Enrolled in Plan',
          status: 'Created',
          code: 201,
          body: { success: true, message: 'Subscribed to scheme successfully', errorCode: null, data: { userScheme: { id: '609d...', schemeName: 'Swarna Bindu Popular', monthlyInvestment: 5000, startDate: '2026-07-08', endDate: '2027-06-08', goalGoldGram: 7.85, status: 'ACTIVE' } } }
        }),
        makeResponse({
          name: 'Forbidden - KYC Required',
          status: 'Forbidden',
          code: 403,
          body: { success: false, message: 'KYC approval is required to subscribe to gold schemes. Please complete your profile KYC.', errorCode: 'KYC_REQUIRED', data: { kycStatus: 'PENDING' } }
        })
      ]
    }),
    makeRequest({
      name: '4. List My Subscribed Schemes',
      method: 'GET',
      path: '/schemes/my-schemes',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Return Joined List',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'My schemes retrieved successfully', errorCode: null, data: { schemes: [{ id: '609d...', schemeName: 'Swarna Bindu Popular', goldAccumulated: 0.716, totalPaid: 5000, status: 'ACTIVE', progressPercent: 8 }] } }
        })
      ]
    })
  ]
};

const clientPaymentFolder = {
  name: 'Payments Flow',
  description: 'Endpoints for payment dues calculation, initializing Razorpay orders, verifying gateway signatures, and downloading tax invoice receipts. Requires {{clientToken}}.',
  item: [
    makeRequest({
      name: '1. Get Outstanding Dues Schedule',
      method: 'GET',
      path: '/payments/dues',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Return Outstanding Dues',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Payment dues retrieved successfully', errorCode: null, data: { totalPendingAmount: 0, nextDueAmount: 5000, nextDueDate: '2026-08-05', schemes: [{ userSchemeId: '609d...', schemeName: 'Swarna Bindu Popular', monthlyInvestment: 5000, paidInstallments: 1, totalInstallments: 11, pendingAmount: 0, nextDueAmount: 5000, nextDueDate: '2026-08-05', status: 'ACTIVE' }] } }
        })
      ]
    }),
    makeRequest({
      name: '2. Initialize Installment Payment Session',
      method: 'POST',
      path: '/payments/initialize',
      authType: 'bearer',
      body: { type: 'json', data: { userSchemeId: '609d...', installmentType: 'CURRENT_MONTH', amount: 5000 } },
      responses: [
        makeResponse({
          name: 'Success - Session Created',
          status: 'Created',
          code: 201,
          body: { success: true, message: 'Payment initialized successfully', errorCode: null, data: { transactionId: '609e...', razorpayOrderId: 'order_abc123xyz', amount: 5000, gst: 0, convenienceFee: 0, totalPayable: 5000, schemeName: 'Swarna Bindu Popular' } }
        })
      ]
    }),
    makeRequest({
      name: '3. Verify Payment Signature & Credit Gold',
      method: 'POST',
      path: '/payments/verify',
      authType: 'bearer',
      body: { type: 'json', data: { transactionId: '609e...', status: 'SUCCESSFUL', paymentMethod: 'UPI - Google Pay' } },
      responses: [
        makeResponse({
          name: 'Success - Gold Weight Credited',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Payment processed and gold credited successfully', errorCode: null, data: { payment: { transactionId: 'TXN918...', invoiceNo: 'INV-2026-1025', razorpayOrderId: 'order_abc123xyz', amountPaid: 5000, goldGained: 0.714, paidAt: '2026-07-08T12:00:00.000Z', paymentMethod: 'UPI - Google Pay', status: 'SUCCESSFUL' }, userScheme: { id: '609d...', goldAccumulated: 1.43, totalPaid: 10000 } } }
        })
      ]
    }),
    makeRequest({
      name: '4. Get Payments Transaction History',
      method: 'GET',
      path: '/payments/history?page=1&limit=10',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Return Transaction Logs',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Payment history retrieved successfully', errorCode: null, data: { history: [{ transactionId: 'TXN918...', schemeName: 'Swarna Bindu Popular', amountPaid: 5000, paymentMethod: 'UPI - Google Pay', paidAt: '2026-07-08T12:00:00.000Z', status: 'SUCCESSFUL', installmentType: 'CURRENT_MONTH' }], pagination: { page: 1, limit: 10, total: 2, pages: 1 } } }
        })
      ]
    }),
    makeRequest({
      name: '5. Download Tax Invoice Receipt Details',
      method: 'GET',
      path: '/payments/receipt/TXN918...',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Return PDF Receipt Metadata',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Receipt retrieved successfully', errorCode: null, data: { receipt: { schemeName: 'Swarna Bindu Popular', schemeStatus: 'ACTIVE', installmentType: 'CURRENT_MONTH', paidAt: '2026-07-08T12:00:00.000Z', amountPaid: 5000, gst: 0, convenienceFee: 0, totalPaid: 5000, transactionId: 'TXN918...', invoiceNo: 'INV-2026-1025', razorpayOrderId: 'order_abc123xyz', paymentMethod: 'UPI - Google Pay' } } }
        })
      ]
    })
  ]
};

const clientGoldFolder = {
  name: 'Gold & Redemptions',
  description: 'Endpoints for viewing live rate fluctuations and executing gold balance cash redemptions. Requires {{clientToken}}.',
  item: [
    makeRequest({
      name: '1. Get Today\'s Live Gold Rate',
      method: 'GET',
      path: '/gold-rate/today',
      authType: 'none',
      responses: [
        makeResponse({
          name: 'Success - Return Fluctuated Rates',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Today\'s gold rate retrieved successfully', errorCode: null, data: { rate22K_per_g: 7012.50, rate24K_per_8g: 56100.00, lastUpdated: '2026-07-08T12:00:00.000Z' } }
        })
      ]
    }),
    makeRequest({
      name: '2. Redeem Gold Balance for Cash Payout',
      method: 'POST',
      path: '/gold/redeem',
      authType: 'bearer',
      body: { type: 'json', data: { userSchemeId: '609d...', goldQuantity: 1.43 } },
      responses: [
        makeResponse({
          name: 'Success - Gold Balance Liquidated',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Gold redeemed successfully', errorCode: null, data: { redemption: { userSchemeId: '609d...', schemeName: 'Swarna Bindu Popular', redeemedGrams: 1.43, goldRateApplied: 7012.50, payoutAmount: 10027.87, payoutBankAccount: { bankName: 'Axis Bank Ltd.', accountNumber: 'XXXX3210' }, status: 'REDEEMED', remainingGoldGrams: 0 } } }
        })
      ]
    })
  ]
};

const clientNotificationFolder = {
  name: 'Notifications',
  description: 'Endpoints for retrieving push notifications alerts history and marking them as read. Requires {{clientToken}}.',
  item: [
    makeRequest({
      name: '1. Get Alerts History',
      method: 'GET',
      path: '/notifications?page=1&limit=15',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Return Logs',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Notifications retrieved successfully', errorCode: null, data: { notifications: [{ _id: '60af...', title: 'Gold Purchase Successful', message: 'You purchased 0.714 g gold successfully.', type: 'GOLD_PURCHASE', isRead: false }], pagination: { page: 1, limit: 15, total: 1, pages: 1 } } }
        })
      ]
    }),
    makeRequest({
      name: '2. Mark Notification as Read',
      method: 'PUT',
      path: '/notifications/60af.../read',
      authType: 'bearer',
      responses: [
        makeResponse({
          name: 'Success - Read Flag Set',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Notification marked as read', errorCode: null, data: { notification: { _id: '60af...', isRead: true } } }
        })
      ]
    }),
    makeRequest({
      name: '3. Register FCM Push Device Token',
      method: 'POST',
      path: '/notifications/register-device',
      authType: 'bearer',
      body: { type: 'json', data: { deviceToken: 'fcm_mock_token_key_12345' } },
      responses: [
        makeResponse({
          name: 'Success - Device Token Registered',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Device token registered successfully', errorCode: null, data: { deviceToken: 'fcm_mock_token_key_12345' } }
        })
      ]
    })
  ]
};

const clientFolder = {
  name: 'Client API Flow',
  description: 'All user-facing mobile client endpoints under `/api/v1/...`. Separated for frontend developers integration.',
  item: [
    clientAuthFolder,
    clientProfileFolder,
    clientSchemeFolder,
    clientPaymentFolder,
    clientGoldFolder,
    clientNotificationFolder
  ]
};

// ==========================================
// 2. ADMIN ROUTE ITEMS
// ==========================================
const adminAuthFolder = {
  name: 'Auth',
  description: 'Authentication endpoints for administrators. Uses {{adminToken}}.',
  item: [
    makeRequest({
      name: '1. Admin Login',
      method: 'POST',
      path: '/admin/auth/login',
      authType: 'none',
      body: { type: 'json', data: { email: 'admin@swarnabindu.com', password: 'admin123' } },
      event: [
        {
          listen: 'test',
          script: {
            exec: [
              'const response = pm.response.json();',
              'if (response.success && response.data && response.data.accessToken) {',
              '    pm.collectionVariables.set("adminToken", response.data.accessToken);',
              '}'
            ],
            type: 'text/javascript'
          }
        }
      ],
      responses: [
        makeResponse({
          name: 'Success - Admin Logged In',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Admin login successful', errorCode: null, data: { admin: { id: '60bf...', name: 'Super Admin', email: 'admin@swarnabindu.com', role: 'SUPER_ADMIN' }, accessToken: 'JWT_ADMIN_ACCESS...' } }
        }),
        makeResponse({
          name: 'Error - Invalid Password',
          status: 'Unauthorized',
          code: 401,
          body: { success: false, message: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS', data: null }
        })
      ]
    }),
    makeRequest({
      name: '2. Register Moderator Admin (Super Admin only)',
      method: 'POST',
      path: '/admin/auth/create-admin',
      authType: 'bearer',
      tokenVar: 'adminToken',
      body: { type: 'json', data: { email: 'moderator@swarnabindu.com', password: 'moderator123', name: 'Jane Moderator', role: 'MODERATOR' } },
      responses: [
        makeResponse({
          name: 'Success - Moderator Created',
          status: 'Created',
          code: 201,
          body: { success: true, message: 'Admin account created successfully', errorCode: null, data: { admin: { id: '60c1...', name: 'Jane Moderator', email: 'moderator@swarnabindu.com', role: 'MODERATOR' } } }
        }),
        makeResponse({
          name: 'Forbidden - Moderator Access Prohibited',
          status: 'Forbidden',
          code: 403,
          body: { success: false, message: 'Forbidden: Access restricted to [SUPER_ADMIN] roles. Your role: MODERATOR', errorCode: 'FORBIDDEN', data: null }
        })
      ]
    })
  ]
};

const adminUserFolder = {
  name: 'Users & KYC Management',
  description: 'Endpoints for viewing client profiles, banning accounts, listing submissions, and approving/rejecting KYC steps. Requires {{adminToken}} with SUPER_ADMIN / MODERATOR roles.',
  item: [
    makeRequest({
      name: '1. List Registered Client Users',
      method: 'GET',
      path: '/admin/users?page=1&limit=10&kycStatus=APPROVED',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Returns List',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Users list retrieved successfully', errorCode: null, data: { users: [{ _id: '609b...', mobileNumber: '+919876543210', kycStatus: 'APPROVED', isBanned: false }], pagination: { page: 1, limit: 10, total: 1, pages: 1 } } }
        })
      ]
    }),
    makeRequest({
      name: '2. Get User Detailed Profile',
      method: 'GET',
      path: '/admin/users/609b...',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Returns Profile details',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'User details retrieved successfully', errorCode: null, data: { user: { _id: '609b...', mobileNumber: '+919876543210', kycStatus: 'APPROVED', kycDetails: { personalInfo: { fullName: 'John Mathew' } } } } }
        })
      ]
    }),
    makeRequest({
      name: '3. Ban / Unban Client User',
      method: 'PUT',
      path: '/admin/users/609b.../ban',
      authType: 'bearer',
      tokenVar: 'adminToken',
      body: { type: 'json', data: { isBanned: true } },
      responses: [
        makeResponse({
          name: 'Success - User Banned',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'User account has been successfully banned', errorCode: null, data: { userId: '609b...', isBanned: true } }
        })
      ]
    }),
    makeRequest({
      name: '4. List Submitted Pending KYC Verification requests',
      method: 'GET',
      path: '/admin/kyc/pending?page=1&limit=10',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Return Submitted list',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Pending KYC review requests retrieved', errorCode: null, data: { pendingList: [{ _id: '609b...', mobileNumber: '+919876543210', kycStatus: 'SUBMITTED', kycDetails: { personalInfo: { fullName: 'John Mathew' } } }], pagination: { page: 1, limit: 10, total: 1, pages: 1 } } }
        })
      ]
    }),
    makeRequest({
      name: '5. Approve KYC Verification',
      method: 'POST',
      path: '/admin/kyc/609b.../approve',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - KYC Approved',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'KYC request approved successfully', errorCode: null, data: { userId: '609b...', kycStatus: 'APPROVED' } }
        })
      ]
    }),
    makeRequest({
      name: '6. Reject KYC Verification',
      method: 'POST',
      path: '/admin/kyc/609b.../reject',
      authType: 'bearer',
      tokenVar: 'adminToken',
      body: { type: 'json', data: { reason: 'PAN card photo uploaded is blurry. Please re-upload.' } },
      responses: [
        makeResponse({
          name: 'Success - KYC Rejected',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'KYC request rejected successfully', errorCode: null, data: { userId: '609b...', kycStatus: 'REJECTED', rejectedReason: 'PAN card photo uploaded is blurry. Please re-upload.' } }
        })
      ]
    })
  ]
};

const adminSchemeFolder = {
  name: 'Schemes Catalog CRUD',
  description: 'Catalog templates management and user subscription inspection. Requires {{adminToken}} with SUPER_ADMIN / MODERATOR roles.',
  item: [
    makeRequest({
      name: '1. List Schemes Catalog templates',
      method: 'GET',
      path: '/admin/schemes?page=1&limit=10',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Return All Templates',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Schemes catalog retrieved successfully', errorCode: null, data: { schemes: [{ _id: '608c...', name: 'Swarna Bindu Popular', monthlyInvestment: 5000, isActive: true }], pagination: { page: 1, limit: 10, total: 3, pages: 1 } } }
        })
      ]
    }),
    makeRequest({
      name: '2. Create a Scheme Template',
      method: 'POST',
      path: '/admin/schemes',
      authType: 'bearer',
      tokenVar: 'adminToken',
      body: { type: 'json', data: { name: 'Swarna Bindu Platinum', description: 'Elite plan for premium savings.', monthlyInvestment: 15000, durationMonths: 11, maturityBenefitPercent: 12, minGoldGram: 30, termsAndConditions: '1. Duration is 11 months.' } },
      responses: [
        makeResponse({
          name: 'Success - Template Created',
          status: 'Created',
          code: 201,
          body: { success: true, message: 'New scheme added to catalog successfully', errorCode: null, data: { scheme: { _id: '60c2...', name: 'Swarna Bindu Platinum', monthlyInvestment: 15000, isActive: true } } }
        })
      ]
    }),
    makeRequest({
      name: '3. Update Scheme specifications',
      method: 'PUT',
      path: '/admin/schemes/60c2...',
      authType: 'bearer',
      tokenVar: 'adminToken',
      body: { type: 'json', data: { description: 'Elite plan updated description details.' } },
      responses: [
        makeResponse({
          name: 'Success - Template Updated',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Scheme updated successfully', errorCode: null, data: { scheme: { _id: '60c2...', name: 'Swarna Bindu Platinum', description: 'Elite plan updated description details.' } } }
        })
      ]
    }),
    makeRequest({
      name: '4. Soft Delete / Toggle Scheme template active status',
      method: 'DELETE',
      path: '/admin/schemes/60c2...',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Template Inactivated',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Scheme status toggled to INACTIVE', errorCode: null, data: { schemeId: '60c2...', isActive: false } }
        })
      ]
    }),
    makeRequest({
      name: '5. View platform user subscriptions list',
      method: 'GET',
      path: '/admin/schemes/subscriptions?page=1&limit=10&status=ACTIVE',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Return Subscribed Plans',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Subscribed schemes retrieved successfully', errorCode: null, data: { subscriptions: [{ _id: '609d...', userId: { mobileNumber: '+919876543210', fullName: 'John Mathew' }, schemeId: { name: 'Swarna Bindu Popular' }, monthlyInvestment: 5000, goldAccumulated: 0.714, totalPaid: 5000, status: 'ACTIVE' }], pagination: { page: 1, limit: 10, total: 1, pages: 1 } } }
        })
      ]
    })
  ]
};

const adminPaymentFolder = {
  name: 'Payments & Rates Management',
  description: 'Financial endpoints for listing payments, overriding gold rates, and manual payment reconciliation. Reconciliations require {{adminToken}} with SUPER_ADMIN role.',
  item: [
    makeRequest({
      name: '1. List Payment Transactions history',
      method: 'GET',
      path: '/admin/payments?page=1&limit=10&status=PENDING',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Return Payment history',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Payments transactions retrieved successfully', errorCode: null, data: { payments: [{ _id: '609e...', userId: { mobileNumber: '+919876543210' }, amount: 5000, status: 'PENDING', installmentType: 'CURRENT_MONTH' }], pagination: { page: 1, limit: 10, total: 1, pages: 1 } } }
        })
      ]
    }),
    makeRequest({
      name: '2. Override live gold rate manually',
      method: 'POST',
      path: '/admin/gold-rate/update',
      authType: 'bearer',
      tokenVar: 'adminToken',
      body: { type: 'json', data: { rate22K_per_g: 7200.00, rate24K_per_8g: 60000.00 } },
      responses: [
        makeResponse({
          name: 'Success - Override Applied',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Gold rate updated successfully', errorCode: null, data: { goldRate: { _id: '60c3...', rate22K_per_g: 7200, rate24K_per_8g: 60000, lastUpdated: '2026-07-08T12:00:00.000Z' } } }
        })
      ]
    }),
    makeRequest({
      name: '3. Manually Reconcile payment (SUPER_ADMIN only)',
      method: 'POST',
      path: '/admin/payments/609e.../reconcile',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Reconciled & Gold Credited',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Payment manually reconciled and gold credited successfully', errorCode: null, data: { payment: { _id: '609e...', status: 'SUCCESSFUL', transactionId: 'TXN889...', invoiceNo: 'INV-2026-5544', paymentMethod: 'Offline Reconciled' }, userScheme: { id: '609d...', goldAccumulated: 1.43, totalPaid: 10000 } } }
        })
      ]
    })
  ]
};

const adminNotificationFolder = {
  name: 'Announcements (Push Alerts)',
  description: 'Endpoints for sending direct alerts or broadcasting notices to all registered users. Requires {{adminToken}} with SUPER_ADMIN / MODERATOR roles.',
  item: [
    makeRequest({
      name: '1. Broadcast Alert announcement to all users',
      method: 'POST',
      path: '/admin/notifications/broadcast',
      authType: 'bearer',
      tokenVar: 'adminToken',
      body: { type: 'json', data: { title: 'Emergency Notice', message: 'The platform will undergo brief upgrades.' } },
      responses: [
        makeResponse({
          name: 'Success - Broadcast queued',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Announcement broadcasted successfully to 1 users', errorCode: null, data: { sentCount: 1 } }
        })
      ]
    }),
    makeRequest({
      name: '2. Send Targeted User alert',
      method: 'POST',
      path: '/admin/notifications/user/609b...',
      authType: 'bearer',
      tokenVar: 'adminToken',
      body: { type: 'json', data: { title: 'Direct Alert Notice', message: 'Please update your account bank details.' } },
      responses: [
        makeResponse({
          name: 'Success - Alert sent',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Targeted notification sent successfully', errorCode: null, data: { notification: { title: 'Direct Alert Notice', type: 'PAYMENT_REMINDER' } } }
        })
      ]
    })
  ]
};

const adminDashboardFolder = {
  name: 'Dashboard & Audit Logs',
  description: 'Administrative stats and diagnostic audit logging. Logs require {{adminToken}} with SUPER_ADMIN role.',
  item: [
    makeRequest({
      name: '1. Get Platform Dashboard Stats',
      method: 'GET',
      path: '/admin/dashboard/stats',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Stats Aggregated',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Dashboard analytics compiled successfully', errorCode: null, data: { users: { total: 1, banned: 0, kyc: { approved: 1, submitted: 0, pending: 0 } }, schemes: { catalogTemplates: 2, activeSubscriptions: 1 }, financials: { totalRevenueReceived: 5000, totalGoldReserveLiabilities: 0.714, currentGoldLiabilityValue: 5012.50 } } }
        })
      ]
    }),
    makeRequest({
      name: '2. View Platform Audit Logs (Super Admin only)',
      method: 'GET',
      path: '/admin/audit-logs?page=1&limit=20',
      authType: 'bearer',
      tokenVar: 'adminToken',
      responses: [
        makeResponse({
          name: 'Success - Return Logs',
          status: 'OK',
          code: 200,
          body: { success: true, message: 'Audit logs retrieved successfully', errorCode: null, data: { logs: [{ _id: '60c4...', adminId: { email: 'admin@swarnabindu.com', name: 'Super Admin' }, action: 'RECONCILE_PAYMENT', targetEntity: 'Payment', createdAt: '2026-07-08T12:00:00.000Z' }], pagination: { page: 1, limit: 20, total: 1, pages: 1 } } }
        })
      ]
    })
  ]
};

const adminFolder = {
  name: 'Admin API Flow',
  description: 'All management endpoints under `/api/v1/admin/...`. Separated for admin dashboard developers integration.',
  item: [
    adminAuthFolder,
    adminUserFolder,
    adminSchemeFolder,
    adminPaymentFolder,
    adminNotificationFolder,
    adminDashboardFolder
  ]
};

collection.item.push(clientFolder);
collection.item.push(adminFolder);

// Write to file
const targetPath = '/Users/abinschandran/Developments/Company/Bictree/Bictree/Swarnabindu_GoldScheme/Swarna_Bindu_Gold_Scheme_API.postman_collection.json';
fs.writeFileSync(targetPath, JSON.stringify(collection, null, 2));
console.log(`Postman collection generated successfully at: ${targetPath}`);
