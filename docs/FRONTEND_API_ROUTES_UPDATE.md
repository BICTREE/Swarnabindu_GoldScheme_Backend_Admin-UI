# 📱 Swarna Bindu Gold Scheme — Frontend API Updates & Integration Reference

> **Document Version:** 2.0.0  
> **Last Updated:** September 4, 2026  
> **Target Audience:** Mobile Developers (Flutter/React Native), Web Frontend Developers, QA Engineers  
> **Environment Base URL (Production / Live):** `https://scheme.bindujewellery.com/api/v1`  
> **Local Development Base URL:** `http://localhost:5001/api/v1`  
> **Remote Postman Collection:** `Swarna Bindu Gold Scheme REST API` *(Workspace: `Bictree`)*

---

## 📑 Table of Contents

1. [Executive Summary & What's New](#1-executive-summary--whats-new)
2. [Connection & Authentication Setup](#2-connection--authentication-setup)
3. [⭐ Feature 1: Unified Customer Dashboard API](#3--feature-1-unified-customer-dashboard-api)
4. [⭐ Feature 2: Installment Receipt PDF Download & Viewing](#4--feature-2-installment-receipt-pdf-download--viewing)
5. [⭐ Feature 3: Unified Single-Call KYC Submission](#5--feature-3-unified-single-call-kyc-submission)
6. [Complete Client API Route Directory](#6-complete-client-api-route-directory)
7. [Error Handling & Status Code Taxonomy](#7-error-handling--status-code-taxonomy)
8. [Flutter / Frontend Integration Code Examples](#8-flutter--frontend-integration-code-examples)

<div style="page-break-after: always;"></div>

---

## 1. Executive Summary & What's New

This document highlights the latest route additions and major architectural enhancements rolled out to the **Swarna Bindu Gold Scheme** backend. Frontend teams can immediately integrate these optimized endpoints:

| Feature Area | Endpoint | HTTP Method | Highlights |
|---|---|---|---|
| **Customer Home Dashboard** | `/user/dashboard`<br>*(alias: `/users/dashboard`)* | `GET` | **Single-call home screen aggregation.** Eliminates 4 sequential requests. Fetches customer profile, live 22K/24K gold rate, enrolled schemes with installment progress %, and cumulative portfolio metrics in parallel. |
| **Payment Receipt Download** | `/payments/receipt/:transactionId/download`<br>*(alias: `/payments/:id/receipt`)* | `GET` | **Branded PDF document download.** Streams a server-generated vector PDF receipt with company header, transaction breakdown table, cumulative gold savings summary, and T&C. Supports `?download=true`. |
| **Payment Receipt Metadata** | `/payments/receipt/:transactionId` | `GET` | **JSON receipt data.** Fast retrieval of invoice numbers, gateway refs, timestamps, and breakdown for displaying in-app modal sheets. |
| **Unified Single-Call KYC** | `/user/kyc/submit-full` | `POST` | **Multipart upload in 1 request.** Allows uploading personal info, identity numbers (PAN/Aadhaar), address, bank details, and all 5 verification documents simultaneously. |

---

## 2. Connection & Authentication Setup

### 2.1 Base URLs

* **Live Remote Production:**
  ```text
  https://scheme.bindujewellery.com/api/v1
  ```
* **Local Backend Server:**
  ```text
  http://localhost:5001/api/v1
  ```

### 2.2 Authorization Header

All endpoints (except OTP login) require the JWT Bearer token:
```http
Authorization: Bearer <accessToken>
```

### 2.3 Mock Testing Credentials

For fast frontend UI development without consuming SMS credits (`MOCK_MODE=true`):

* **Test Mobile Number:** Any valid Indian mobile number (e.g. `+919876543210`)
* **Fixed Development OTP:** `123456`
* **Pre-Seeded Account Profiles:**
  * `+919876543210` (John Mathew) — **KYC Approved** with active scheme & transactions.
  * `+919123456789` (Sarah Connor) — **KYC Submitted** (under review banner).
  * `+917788990011` (Ravi Shankar) — **KYC Rejected** (re-upload alert).
  * `+919000111222` — **New User / Pending KYC**.

<div style="page-break-after: always;"></div>

---

## 3. ⭐ Feature 1: Unified Customer Dashboard API

### 3.1 Overview
Previously, loading the mobile app home screen required querying the user profile, querying today's gold rate, querying active subscriptions, and querying recent payment dues separately.  
The **Customer Dashboard API** executes these queries in parallel via `Promise.all` and aggregates everything into one unified, ready-to-render payload.

* **Endpoint:** `GET /api/v1/user/dashboard`
* **Alternate Alias:** `GET /api/v1/users/dashboard`
* **Authentication:** Required (`Bearer <accessToken>`)
* **Content-Type:** `application/json`

### 3.2 Success Response (200 OK)

```json
{
  "success": true,
  "message": "User dashboard retrieved successfully",
  "errorCode": null,
  "data": {
    "user": {
      "id": "60a92b2345ef890012ab34cd",
      "mobileNumber": "+919876543210",
      "fullName": "John Mathew",
      "email": "john.mathew@gmail.com",
      "profilePicture": "/uploads/profile-60a92b23.jpg",
      "kycStatus": "APPROVED",
      "isVerified": true
    },
    "goldRate": {
      "rate22K_per_g": 7000.00,
      "rate24K_per_8g": 56000.00,
      "ratePerGram24K": 7000.00,
      "ratePerGram22K": 7000.00,
      "currency": "INR",
      "lastUpdated": "2026-09-04T08:30:00.000Z"
    },
    "summary": {
      "totalSchemes": 1,
      "activeSchemes": 1,
      "redeemedSchemes": 0,
      "totalGramsSaved": 0.714,
      "totalAmountPaid": 5000.00,
      "currentGoldValue": 4998.00,
      "nextInstallmentDue": 5000.00,
      "nextDueDate": "2026-10-05"
    },
    "portfolio": [
      {
        "userSchemeId": "66d84a1e98bc7211a01ef34a",
        "schemeId": "66d8495098bc7211a01ef340",
        "schemeName": "Swarna Bindu Popular",
        "monthlyInvestment": 5000,
        "durationMonths": 11,
        "installmentsPaid": 1,
        "totalInstallments": 11,
        "remainingInstallments": 10,
        "progressPercent": 9,
        "goldAccumulated": 0.714,
        "goalGoldGram": 7.857,
        "totalAmountPaid": 5000.00,
        "status": "ACTIVE",
        "startDate": "2026-09-04T10:00:00.000Z",
        "endDate": "2027-08-04T10:00:00.000Z",
        "redeemedAt": null,
        "maturityBenefitPercent": 8
      }
    ]
  }
}
```

### 3.3 Field Description Guide

| JSON Field | Type | Description |
|---|---|---|
| `user.kycStatus` | `String` | `'PENDING'`, `'SUBMITTED'`, `'APPROVED'`, or `'REJECTED'`. Use to toggle action banners. |
| `goldRate.ratePerGram24K` | `Number` | Today's 24K gold price per gram in INR. |
| `goldRate.ratePerGram22K` | `Number` | Today's 22K gold price per gram in INR. |
| `summary.totalGramsSaved` | `Number` | Total fine gold weight accumulated across all schemes (grams). |
| `summary.currentGoldValue`| `Number` | Estimated market liquidation value of saved gold at today's rate (`totalGramsSaved * ratePerGram24K`). |
| `summary.nextDueDate` | `String` | ISO date of the next upcoming installment due (typically 5th of next month). |
| `portfolio[].progressPercent`| `Number` | Completion percentage (`(installmentsPaid / totalInstallments) * 100`). Ideal for progress bars. |
| `portfolio[].remainingInstallments` | `Number` | Number of installments left to reach maturity. |

<div style="page-break-after: always;"></div>

---

## 4. ⭐ Feature 2: Installment Receipt PDF Download & Viewing

### 4.1 Overview
The backend now features a high-fidelity PDF rendering engine using **PDFKit**. When an installment is paid, frontend clients can offer customers an official, branded tax invoice receipt PDF.

### 4.2 Endpoint Options

#### Option A: Download Receipt PDF (Direct Binary Stream)
* **Endpoint:** `GET /api/v1/payments/receipt/:transactionId/download`
* **Alternative:** `GET /api/v1/payments/:id/receipt`
* **Query Parameters:**
  * `?download=true` — Sets `Content-Disposition: attachment; filename="receipt-INV-2026-xxxxx.pdf"` to trigger a native file save dialog.
  * Omitted / `false` — Sets `Content-Disposition: inline; filename="..."` suitable for in-app PDF viewer rendering.
* **Identifier Parameter (`:transactionId` or `:id`):** Accepts the string transaction ID (e.g. `TXN982662739797`), the invoice number (`INV-2026-67006`), or the MongoDB `_id` (`66d84a1e98bc...`).
* **Headers:** `Authorization: Bearer <accessToken>`
* **Response Content-Type:** `application/pdf`
* **Security:** Enforces IDOR protection. Customers can only download receipts belonging to their authenticated account. Unauthorized requests return `403 Forbidden`.

#### Option B: Retrieve Receipt Metadata (JSON)
* **Endpoint:** `GET /api/v1/payments/receipt/:transactionId`
* **Headers:** `Authorization: Bearer <accessToken>`
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Receipt retrieved successfully",
  "errorCode": null,
  "data": {
    "receipt": {
      "schemeName": "Swarna Bindu Popular",
      "schemeStatus": "ACTIVE",
      "installmentType": "CURRENT_MONTH",
      "paidAt": "2026-09-04T12:00:00.000Z",
      "amountPaid": 5000,
      "gst": 0,
      "convenienceFee": 0,
      "totalPaid": 5000,
      "transactionId": "TXN982662739797",
      "invoiceNo": "INV-2026-67006",
      "razorpayOrderId": "order_PX983214abc",
      "paymentMethod": "UPI - Google Pay"
    }
  }
}
```
*(Tip: Passing `?format=pdf` to `/receipt/:transactionId` also streams the PDF directly).*

### 4.3 Visual Elements Included in the Generated PDF
1. **Header Bar:** Gold accent (`#9A7B2C`) with Bindu Jewellery corporate typography, support contacts, and live receipt serial number.
2. **Customer & Scheme Cards:** Full customer name, registered mobile, masked PAN card (`ABCDE****F`), and scheme subscription ID.
3. **Transaction Breakdown Table:** Gold rate per gram at time of payment, weight credited (in grams to 3 decimals), base amount, GST/convenience fees, and highlighted Net Amount Paid (`#FEFCE8`).
4. **Cumulative Savings Summary (3 Cards):**
   * Total Gold Accumulated (g)
   * Total Amount Invested (INR)
   * Installments Completed count
5. **Legal & Security:** Authenticity disclaimer, terms & conditions, and authorized digital stamp notice.

<div style="page-break-after: always;"></div>

---

## 5. ⭐ Feature 3: Unified Single-Call KYC Submission

### 5.1 Overview
Rather than requiring the mobile app to execute 5 separate sequential steps, the unified single-call KYC endpoint accepts all form fields and all multipart document files in a single `POST` request.

* **Endpoint:** `POST /api/v1/user/kyc/submit-full`
* **Authentication:** Required (`Bearer <accessToken>`)
* **Content-Type:** `multipart/form-data`

### 5.2 Form-Data Parameters

| Key | Type | Requirement | Description / Validation |
|---|---|---|---|
| **`fullName`** | Text | Required | Min 2 chars (e.g. `John Mathew`) |
| **`dob`** | Text | Required | ISO date format: `YYYY-MM-DD` |
| **`gender`** | Text | Required | `Male`, `Female`, or `Other` |
| **`email`** | Text | Required | Valid email string |
| **`aadhaarNumber`** | Text | Required | Exactly 12 digits (`^\d{12}$`) |
| **`panNumber`** | Text | Required | Valid Indian PAN (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`) |
| **`houseName`** | Text | Required | House name / Flat / Apartment |
| **`street`** | Text | Required | Street / Road |
| **`landmark`** | Text | Optional | Nearby landmark |
| **`city`** | Text | Required | City name |
| **`district`** | Text | Required | District |
| **`state`** | Text | Required | State (e.g. `Kerala`) |
| **`pinCode`** | Text | Required | 6-digit postal code (`^\d{6}$`) |
| **`latitude`** | Text / Number | Optional | Geolocation latitude coordinate |
| **`longitude`** | Text / Number | Optional | Geolocation longitude coordinate |
| **`accountHolderName`**| Text | Required | Name as printed on bank passbook |
| **`bankName`** | Text | Required | Bank institution name |
| **`accountNumber`** | Text | Required | 9 to 18 digit account number |
| **`confirmAccountNumber`**| Text | Required | Must match `accountNumber` identically |
| **`ifscCode`** | Text | Required | Valid IFSC code (e.g. `UTIB0001234`) |
| **`branchName`** | Text | Required | Branch name |
| **`upiId`** | Text | Optional | e.g. `user@okhdfcbank` |
| **`profilePicture`** | File | Optional | Image (JPEG, PNG, WebP) |
| **`aadhaarFront`** | File | Required | Image or PDF of Aadhaar front side |
| **`aadhaarBack`** | File | Required | Image or PDF of Aadhaar back side |
| **`panCardPhoto`** | File | Required | Image or PDF of PAN card |
| **`selfie`** | File | Required | Live customer face photo / selfie |

### 5.3 Success Response (200 OK)

```json
{
  "success": true,
  "message": "KYC details and verification documents submitted successfully",
  "errorCode": null,
  "data": {
    "kycStatus": "SUBMITTED",
    "submittedAt": "2026-09-04T08:45:00.000Z"
  }
}
```

<div style="page-break-after: always;"></div>

---

## 6. Complete Client API Route Directory

All routes below are prefixed with `/api/v1`.

### 6.1 Authentication (`/auth`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/send-otp` | No | Send 6-digit verification OTP to mobile number |
| `POST` | `/auth/verify-otp` | No | Verify OTP, register FCM device token, and return JWT tokens |
| `POST` | `/auth/refresh` | No | Refresh expired `accessToken` using `refreshToken` |

### 6.2 Customer & Profile (`/user` & `/users`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/user/dashboard` *(or `/users/dashboard`)* | **Yes** | **⭐ Unified Home Dashboard aggregation** |
| `GET` | `/user/profile` | **Yes** | Detailed user profile & investment summary |
| `GET` | `/user/kyc/status` | **Yes** | Returns current `kycStatus` and `rejectedReason` (if any) |
| `POST` | `/user/kyc/submit-full` | **Yes** | **⭐ Single-call multipart complete KYC submission** |
| `PUT` | `/user/kyc/personal` | **Yes** | Step 1 draft save: Personal info & avatar |
| `PUT` | `/user/kyc/identity` | **Yes** | Step 2 draft save: Aadhaar, PAN numbers & docs |
| `PUT` | `/user/kyc/address` | **Yes** | Step 3 draft save: Residential address |
| `PUT` | `/user/kyc/bank` | **Yes** | Step 4 draft save: Bank details |
| `POST` | `/user/kyc/submit` | **Yes** | Step 5 finalize: Submit selfie and mark `SUBMITTED` |

### 6.3 Scheme Catalog (`/schemes`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/schemes` | No / Yes | List all active gold schemes with investment rules |
| `GET` | `/schemes/:id` | No / Yes | Get scheme specifications & maturity bonuses |
| `POST` | `/schemes/:id/join` | **Yes** | Subscribe/enroll in scheme (Requires `kycStatus == APPROVED`) |

### 6.4 Payments & Invoices (`/payments`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/payments/dues` | **Yes** | Fetch outstanding dues and due date schedule |
| `POST` | `/payments/initialize` | **Yes** | Create Razorpay order session & pending transaction |
| `POST` | `/payments/verify` | **Yes** | Verify payment, credit gold weight, and issue invoice |
| `GET` | `/payments/history` | **Yes** | Paginated payment transaction history |
| `GET` | `/payments/receipt/:transactionId` | **Yes** | Retrieve payment receipt metadata (JSON) |
| `GET` | `/payments/receipt/:transactionId/download` | **Yes** | **⭐ Download branded PDF receipt (`application/pdf`)** |
| `GET` | `/payments/:id/receipt` | **Yes** | **⭐ Download branded PDF receipt by Payment ID** |

### 6.5 Live Gold Rate & Redemptions (`/gold-rate` & `/gold`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/gold-rate/today` | No | Fetch today's 22K (per g) and 24K (per 8g) rates |
| `POST` | `/gold/redeem` | **Yes** | Redeem accumulated gold grams for bank payout |

### 6.6 Notifications (`/notifications`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/notifications` | **Yes** | Fetch customer alert and transaction notifications |
| `POST` | `/notifications/register-device` | **Yes** | Register / update FCM device push notification token |
| `PUT` | `/notifications/:id/read` | **Yes** | Mark specific notification as read |

<div style="page-break-after: always;"></div>

---

## 7. Error Handling & Status Code Taxonomy

All error responses return a standardized JSON structure:

```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "errorCode": "MACHINE_READABLE_CODE",
  "data": null
}
```

### Standard Error Codes:

| HTTP Status | Error Code (`errorCode`) | Cause / Recommended Frontend Action |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request payload failed schema checks. Display `message`. |
| `400` | `INVALID_OTP` | Incorrect verification code entered. Keep OTP input active. |
| `400` | `KYC_NOT_APPROVED` | User attempted to join scheme or pay before KYC approval. Navigate user to KYC status screen. |
| `401` | `TOKEN_EXPIRED` | Access token expired. Trigger silent refresh via `/auth/refresh`. |
| `401` | `INVALID_TOKEN` | Bearer token corrupted. Clear storage and redirect to Login screen. |
| `403` | `UNAUTHORIZED_ACCESS` | IDOR protection: User tried to view/download another user's receipt. Show security toast. |
| `404` | `RECEIPT_NOT_FOUND` | No transaction matches the requested transaction ID / invoice ID. |
| `404` | `USER_NOT_FOUND` | User account does not exist. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server condition. Prompt user to retry in a moment. |

---

## 8. Flutter / Frontend Integration Code Examples

### 8.1 Fetching Customer Dashboard (Dart / Dio)

```dart
import 'package:dio/dio.dart';

class DashboardService {
  final Dio _dio;

  DashboardService(this._dio);

  Future<Map<String, dynamic>?> fetchCustomerDashboard() async {
    try {
      final response = await _dio.get('/user/dashboard');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['data'];
      }
      return null;
    } on DioException catch (e) {
      print('Dashboard fetch failed: ${e.response?.data['message'] ?? e.message}');
      return null;
    }
  }
}
```

### 8.2 Downloading & Saving the Payment Receipt PDF

```dart
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';

Future<void> downloadAndOpenReceiptPdf(String transactionId, String accessToken) async {
  final dio = Dio(BaseOptions(
    baseUrl: 'https://scheme.bindujewellery.com/api/v1',
    headers: {'Authorization': 'Bearer $accessToken'},
  ));

  try {
    // 1. Get temporary storage directory on the device
    final dir = await getApplicationDocumentsDirectory();
    final savePath = '${dir.path}/receipt-$transactionId.pdf';

    // 2. Download the binary stream with responseType: bytes
    await dio.download(
      '/payments/receipt/$transactionId/download',
      savePath,
      queryParameters: {'download': 'true'},
    );

    print('Receipt downloaded to: $savePath');

    // 3. Open in native PDF viewer
    await OpenFilex.open(savePath);
  } catch (e) {
    print('Failed to download receipt: $e');
  }
}
```

---

## 9. Developer Hand-off Checklist

Before building UI screens, verify:
* [x] **Live API Online:** `https://scheme.bindujewellery.com/api/v1/health` returns `200 OK`.
* [x] **Postman Updated:** Imported `Swarna Bindu Gold Scheme REST API` from the `Bictree` workspace.
* [x] **Dashboard Integrated:** Single API call `GET /user/dashboard` mapped to Home Screen state.
* [x] **PDF Receipt Integrated:** "Download Receipt" button calls `GET /payments/receipt/:id/download`.
* [x] **Mock OTP Ready:** Test with `+919876543210` and OTP `123456`.
