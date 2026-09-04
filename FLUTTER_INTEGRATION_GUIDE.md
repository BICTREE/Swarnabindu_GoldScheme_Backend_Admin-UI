# 📱 Swarna Bindu Gold Scheme — Flutter Mobile Integration Guide

Welcome to the **Swarna Bindu Gold Scheme** backend integration guide! This document provides all the essential details, endpoint payloads, authentication rules, test credentials, and Postman collection files needed to build and test the Flutter mobile application.

---

## 🚀 Quick Setup & Base URL

* **Server API Base URL:** `https://scheme.bindujewellery.com/api/v1`
* **Local Backend URL (Optional):** `http://localhost:5001/api/v1`
* **Postman Collection File:** [`Swarna_Bindu_Gold_Scheme_API.postman_collection.json`](./Swarna_Bindu_Gold_Scheme_API.postman_collection.json) *(Collection Name: `Dev_Swarna Bindu Gold Scheme REST API`)*

> 💡 **Postman Cloud Workspace:** Search for **`Dev_Swarna Bindu Gold Scheme REST API`** in your Postman workspace for pre-configured requests with auto-captured JWT tokens.

---

## 🔑 Authentication Flow (OTP & JWT)

### 1. Mock OTP Mode Active (`MOCK_MODE=true`)
For fast development without needing real SMS credits:
* You can test with **any mobile number** (e.g. `+919876543210`).
* Use the fixed OTP: **`123456`**.

### 2. Login Flow (2 Steps)

#### Step 1: Send OTP
* **Endpoint:** `POST /auth/send-otp`
* **Headers:** `Content-Type: application/json`
* **Body:**
```json
{
  "mobileNumber": "+919876543210"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "data": {
    "otpSent": true,
    "expiresInSeconds": 300
  }
}
```

#### Step 2: Verify OTP
* **Endpoint:** `POST /auth/verify-otp`
* **Headers:** `Content-Type: application/json`
* **Body:**
```json
{
  "mobileNumber": "+919876543210",
  "otp": "123456",
  "deviceToken": "fcm_client_device_token_from_flutter"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": "60a92b23...",
      "mobileNumber": "+919876543210",
      "kycStatus": "APPROVED"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

### 3. Authorized Requests Header
For all protected endpoints, pass the `accessToken` in the `Authorization` header:
```http
Authorization: Bearer <accessToken>
```

---

## 🧪 Pre-Seeded Test Accounts

Use these seeded phone numbers to test all possible user states in your Flutter app UI:

| Mobile Number | Full Name | KYC Status | Test Use Case in Flutter UI |
|---|---|---|---|
| **`+919876543210`** | John Mathew | **`APPROVED`** ✅ | Test active savings dashboard, dues, making payments, and gold redemption. |
| **`+919444333222`** | Prasha Nair | **`APPROVED`** ✅ | Test high-tier gold scheme (`Elite` plan) & multi-month transaction history. |
| **`+919123456789`** | Sarah Connor | **`SUBMITTED`** ⏳ | Test "KYC Under Review" UI banner & locked scheme joining. |
| **`+917788990011`** | Ravi Shankar | **`REJECTED`** ❌ | Test "KYC Rejected" alert screen & document re-upload form. |
| **`+919000111222`** | *New User* | **`PENDING`** 🔄 | Test new user onboarding & step-by-step KYC submission wizard. |

---

## 📑 KYC Submission Steps (5 Steps)

Users must have `kycStatus == 'APPROVED'` before they can subscribe to gold schemes or make payments.

1. **`PUT /user/kyc/personal`** (Multipart Form-Data)
   * Fields: `fullName`, `dob`, `gender`, `email`, `profilePicture` (file)
2. **`PUT /user/kyc/identity`** (Multipart Form-Data)
   * Fields: `aadhaarNumber`, `panNumber`, `aadhaarFront` (file), `aadhaarBack` (file), `panCardPhoto` (file)
3. **`PUT /user/kyc/address`** (JSON)
   * Fields: `houseName`, `street`, `city`, `district`, `state`, `pinCode`, `latitude`, `longitude`
4. **`PUT /user/kyc/bank`** (JSON)
   * Fields: `accountHolderName`, `bankName`, `accountNumber`, `confirmAccountNumber`, `ifscCode`, `branchName`, `upiId`
5. **`POST /user/kyc/submit`** (Multipart Form-Data)
   * Fields: `selfie` (file)
   * *Status changes from `PENDING` → `SUBMITTED`.*

---

## 💳 Payment Flow Integration

### Step 1: Fetch Dues
* **Endpoint:** `GET /payments/dues`
* Returns current month's due amount, due date (5th of each month), and pending dues count.

### Step 2: Initialize Payment (Order Creation)
* **Endpoint:** `POST /payments/initialize`
* **Body:**
```json
{
  "userSchemeId": "<userSchemeId_from_profile_or_dues>",
  "installmentType": "CURRENT_MONTH",
  "amount": 5000
}
```
* **Returns:** `transactionId` and `razorpayOrderId`.

### Step 3: Verify Payment & Credit Gold
* **Endpoint:** `POST /payments/verify`
* **Body (Dev / Mock Mode):**
```json
{
  "transactionId": "<transactionId_from_step_2>",
  "status": "SUCCESSFUL",
  "paymentMethod": "UPI - Google Pay"
}
```
* **Result:** Backend computes gold weight gained based on today's live rate and credits it to the user's balance.

---

## 📊 Customer Home Dashboard (All-in-One Aggregation)

Fetch the complete customer home screen data in a single network request:
* **Endpoint:** `GET /user/dashboard` *(or `/users/dashboard`)*
* **Headers:** `Authorization: Bearer <accessToken>`
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "User dashboard retrieved successfully",
  "data": {
    "user": {
      "id": "60a92b23...",
      "mobileNumber": "+919876543210",
      "fullName": "John Mathew",
      "email": "john@gmail.com",
      "profilePicture": "/uploads/profile-123.jpg",
      "kycStatus": "APPROVED",
      "isVerified": true
    },
    "goldRate": {
      "rate22K_per_g": 7000,
      "rate24K_per_8g": 56000,
      "ratePerGram24K": 7000,
      "ratePerGram22K": 7000,
      "currency": "INR",
      "lastUpdated": "2026-09-04T10:00:00.000Z"
    },
    "summary": {
      "totalSchemes": 1,
      "activeSchemes": 1,
      "redeemedSchemes": 0,
      "totalGramsSaved": 0.714,
      "totalAmountPaid": 5000,
      "currentGoldValue": 4998,
      "nextInstallmentDue": 5000,
      "nextDueDate": "2026-10-05"
    },
    "portfolio": [
      {
        "userSchemeId": "60b94c31...",
        "schemeId": "60a81d11...",
        "schemeName": "Swarna Bindu Popular",
        "monthlyInvestment": 5000,
        "durationMonths": 11,
        "installmentsPaid": 1,
        "totalInstallments": 11,
        "remainingInstallments": 10,
        "progressPercent": 9,
        "goldAccumulated": 0.714,
        "goalGoldGram": 7.857,
        "totalAmountPaid": 5000,
        "status": "ACTIVE",
        "startDate": "2026-09-04T10:00:00.000Z",
        "endDate": "2027-08-04T10:00:00.000Z",
        "maturityBenefitPercent": 8
      }
    ]
  }
}
```

---

## 💰 Live Gold Rate & Redemptions

* **Get Gold Rate:** `GET /gold-rate/today`
  * Returns 22K (per gram) and 24K (per 8 grams) live prices.
* **Redeem Gold:** `POST /gold/redeem`
  * Body: `{ "userSchemeId": "...", "goldQuantity": 1.43 }`
  * Liquidates gold balance into cash payout to user's registered bank account.

---

## 🧾 Download Payment Receipt (PDF & JSON)

* **Download Branded PDF Receipt:**
  * **Endpoint:** `GET /payments/receipt/:transactionId/download?download=true` *(or `GET /payments/:id/receipt`)*
  * **Headers:** `Authorization: Bearer <accessToken>`
  * **Response:** Streams `application/pdf` binary with `Content-Disposition: attachment; filename="receipt-INV-2026-xxxxx.pdf"`.
* **Get JSON Receipt Metadata:**
  * **Endpoint:** `GET /payments/receipt/:transactionId`
  * Returns JSON breakdown with amount, gold rate, gold weight, GST, invoice number, and payment timestamp.

---

## 📦 Hand-off Files Checklist for Developer

When sharing with the Flutter Developer, provide:
1. 📄 **This Integration Guide:** `FLUTTER_INTEGRATION_GUIDE.md`
2. 📄 **Postman Collection File:** `Swarna_Bindu_Gold_Scheme_API.postman_collection.json`
3. 🌐 **Live Dev API Endpoint:** `https://scheme.bindujewellery.com/api/v1`
