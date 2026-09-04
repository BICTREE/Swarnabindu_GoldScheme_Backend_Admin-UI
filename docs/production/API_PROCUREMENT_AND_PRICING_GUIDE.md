# 💼 Swarna Bindu Gold Scheme — Production Third-Party APIs, Pricing & Formalities Guide

> **Document Version:** 2.0.0  
> **Target Audience:** Management, Business Operations, Finance & Technical Leads  
> **Date:** September 4, 2026  
> **Project:** Swarna Bindu Digi Gold Savings Scheme (Backend & Mobile App)

---

## 📑 Table of Contents

1. [Executive Summary & Estimated Budget](#1-executive-summary--estimated-budget)
2. [Master Services, Pricing & Timelines Table](#2-master-services-pricing--timelines-table)
3. [Required Business Formalities by Provider](#3-required-business-formalities-by-provider)
   - [3.1 Payment Gateway — Razorpay](#31-payment-gateway--razorpay)
   - [3.2 SMS OTP Gateway & DLT Regulation — Fast2SMS / MSG91](#32-sms-otp-gateway--dlt-regulation--fast2sms--msg91)
   - [3.3 WhatsApp Business API — Meta Cloud API](#33-whatsapp-business-api--meta-cloud-api)
   - [3.4 Live Gold Rate Feed — GoldAPI.io](#34-live-gold-rate-feed--goldapiio)
   - [3.5 Automated KYC & Bank Verification — Surepass.io](#35-automated-kyc--bank-verification--surepassio)
   - [3.6 Free Services (Push Alerts & Infrastructure)](#36-free-services-push-alerts--infrastructure)
4. [Master Corporate Documents Checklist](#4-master-corporate-documents-checklist)
5. [Recommended 3-Phase Procurement Roadmap](#5-recommended-3-phase-procurement-roadmap)
6. [Corresponding Environment (`.env`) Mapping](#6-corresponding-environment-env-mapping)

<div style="page-break-after: always;"></div>

---

## 1. Executive Summary & Estimated Budget

To operate the **Swarna Bindu Gold Scheme** live in production with real customer payments, regulatory compliance, and automated messaging, the platform connects to several licensed external services.

### 1.1 Estimated Initial & Monthly Operating Costs

| Cost Type | Service | Estimated Cost (INR) | Billing Model |
|---|---|---|---|
| **One-Time Setup** | Telecom DLT Portal Registration (Govt / Telecom charge) | **~₹5,900** | One-time official fee |
| **Transaction Fee** | Razorpay Payment Gateway | **~1.5% – 2.0%** per payment | Deducted per transaction |
| **Usage / Consumption** | Fast2SMS (OTP verification) | **~₹0.18** per SMS | Prepaid wallet (~₹1,000 pack) |
| **Usage / Consumption** | Meta WhatsApp Utility Messages | **~₹0.35** per utility alert | Postpaid via Meta Ad Account |
| **Monthly Subscription**| GoldAPI.io (Live 22K/24K Rates) | **~$10 / mo (~₹850 / mo)** | Monthly recurring card billing |
| **Usage / Consumption** | Surepass.io (Aadhaar / PAN verification) | **~₹1.50 – ₹2.50** per check | Pay-as-you-go wallet (~₹1,000) |
| **Monthly Hosting** | MongoDB Atlas (Database) | **₹0 (M0 Free)** to **~₹2,000/mo (M10)** | Monthly scaling |

> 💡 **Development Note:** The codebase currently has **`MOCK_MODE=true`** enabled. Frontend development, demo presentations, and QA testing can proceed **at ₹0 cost** without waiting for these vendor approvals.

---

## 2. Master Services, Pricing & Timelines Table

| Category | Recommended Provider | Pricing in India (Approx.) | Setup / Activation Fee | Approval Timeline | Priority |
|---|---|---|---|---|---|
| **Payment Gateway** | **Razorpay** *(or Cashfree / PhonePe)* | **~2%** per transaction + GST *(UPI often 0% or ~0.5%)* | **₹0** (No setup fee) | **2 – 4 Business Days** | **Critical (Day 1)** |
| **SMS OTP Service** | **Fast2SMS** *(or MSG91)* | **₹0.15 – ₹0.22** per SMS OTP | **₹0** (Prepaid credits recharge) | **1 – 3 Days** *(DLT needed)* | **Critical (Day 1)** |
| **WhatsApp Messages**| **Meta Cloud API** *(Direct)* | **~₹0.30 – ₹0.40** per Utility message *(Receipts/Reminders)* | **₹0** (First 1,000 service convos free/mo) | **2 – 5 Business Days** | **High** |
| **Live Gold Rates** | **GoldAPI.io** | **Free tier:** 100 calls/mo<br>**Starter:** ~$10/mo (~₹850/mo) | Monthly card subscription | **Instant** | **High** |
| **KYC Verification** | **Surepass.io** *(or Cashfree Verification)* | **₹1.50 – ₹2.50** per PAN/Aadhaar/Penny Drop | Pay-as-you-go credit wallet | **1 – 2 Business Days** | **Medium** |
| **Push Notifications**| **Google Firebase FCM** | **100% FREE** *(Unlimited alerts)* | **₹0** | **Instant** | **Low (Free)** |
| **Cloud Database** | **MongoDB Atlas** | **M0 Sandbox:** Free<br>**Dedicated M10:** ~$25/mo | Pay-as-you-go | **Instant** | **Completed** |

<div style="page-break-after: always;"></div>

---

## 3. Required Business Formalities by Provider

### 3.1 Payment Gateway — Razorpay

Razorpay processes customer installment deposits via UPI, Debit Cards, Credit Cards, and Net Banking.

* **Website:** [https://razorpay.com](https://razorpay.com)
* **Approval Timeline:** 2 to 4 business days
* **Required Documentation:**
  1. Business PAN Card (Company / LLP / Proprietorship).
  2. GST Registration Certificate.
  3. Cancelled Cheque or Bank Statement showing Current Account in business name.
  4. Authorized Signatory (Owner / Director) PAN & Aadhaar.
  5. Live website or app link showing:
     * Terms & Conditions page.
     * Privacy Policy page.
     * Pricing / Scheme Details page.
     * Refund & Cancellation Policy page.
* **Formalities:**
  1. Sign up on Razorpay and complete the online Merchant KYC questionnaire.
  2. Upload business registration proofs.
  3. Complete penny drop bank verification.
  4. Generate `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in **Live Mode**.
  5. Configure the Webhook URL in Razorpay Dashboard:  
     `https://scheme.bindujewellery.com/api/v1/payments/verify`

---

### 3.2 SMS OTP Gateway & DLT Regulation — Fast2SMS / MSG91

Under Indian Telecom Regulatory Authority (TRAI) guidelines, commercial and transactional SMS messages can only be sent through verified DLT entities.

* **Website:** [https://www.fast2sms.com](https://www.fast2sms.com) (or [https://msg91.com](https://msg91.com))
* **Approval Timeline:** 2 to 3 days for DLT; Fast2SMS account instant.
* **DLT Registration Formalities:**
  1. **Step 1:** Register as a "Principal Entity" on any Telecom DLT portal:
     * Jio DLT: [https://trueconnect.jio.com](https://trueconnect.jio.com)
     * Airtel DLT: [https://www.airtel.in/business/commercial-communication](https://www.airtel.in/business/commercial-communication)
     * Vodafone Idea DLT: [https://www.vilpower.in](https://www.vilpower.in)
     *(A statutory registration fee of ~₹5,900 is charged by the telecom operators).*
  2. **Step 2:** Register a 6-letter alphabetic Header / Sender ID (e.g. `SWRNBD` or `BINDUJ`).
  3. **Step 3:** Register the transactional OTP Content Template:
     ```text
     Your verification OTP for Swarna Bindu Gold Scheme is {#var#}. Valid for 5 minutes. Please do not share this with anyone.
     ```
  4. **Step 4:** In Fast2SMS / MSG91 dashboard, enter your DLT Entity ID and Template ID.
  5. Copy `FAST2SMS_API_KEY` into `.env`.

<div style="page-break-after: always;"></div>

---

### 3.3 WhatsApp Business API — Meta Cloud API

The backend dispatches automated WhatsApp messages for:
* Instant Payment Success & Gold Allocation receipts.
* Monthly installment due alerts.
* Scheme enrollment welcome messages.

* **Website:** [https://developers.facebook.com](https://developers.facebook.com)
* **Approval Timeline:** 2 to 5 business days
* **Formalities & Requirements:**
  1. **Dedicated Phone Number:** Must be a fresh mobile or landline number **not currently registered on personal WhatsApp or WhatsApp Business App**.
  2. **Facebook Business Manager:** Create a Meta Business Manager account at [business.facebook.com](https://business.facebook.com).
  3. **Business Verification:** Submit GST Certificate, utility bill, and business PAN to verify the business in Meta Security Center.
  4. **Pre-Approved Message Templates:** Register and submit the following 3 utility templates for Meta approval:
     * `payment_success_template` (Utility)
     * `payment_reminder_template` (Utility)
     * `new_scheme_joined_template` (Utility)
  5. Copy `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_API_TOKEN` into `.env`.

---

### 3.4 Live Gold Rate Feed — GoldAPI.io

Provides live 22K (per gram) and 24K (per 8g) spot gold prices so the backend can automatically calculate gold grams credited upon installment receipt.

* **Website:** [https://www.goldapi.io](https://www.goldapi.io)
* **Approval Timeline:** Instant
* **Pricing:**
  * **Free Plan:** 100 requests/month (suitable for periodic checks).
  * **Starter Plan:** ~$10/month (~₹850/month) for 500 requests/day.
* **Formalities:**
  1. Register an account with an email address.
  2. Subscribe to the Starter Plan via credit/debit card.
  3. Copy your API token to `GOLD_API_KEY` in `.env`.

---

### 3.5 Automated KYC & Bank Verification — Surepass.io

Provides instant validation of customer identity before gold scheme enrollment:
* Real-time PAN Card name and status check.
* Aadhaar OTP or document verification.
* Bank Account Penny Drop (verifies account holder name matches KYC).

* **Website:** [https://surepass.io](https://surepass.io) (or Cashfree Identity)
* **Approval Timeline:** 1 to 2 business days
* **Pricing:**
  * PAN Verification: ~₹1.50 per check.
  * Bank Account Verification: ~₹2.00 per check.
  * Pay-as-you-go credit wallet model (recharge e.g. ₹1,000–₹2,000).
* **Formalities:** Sign up, complete online business KYC, and copy API token to `KYC_API_KEY`.

<div style="page-break-after: always;"></div>

---

## 4. Master Corporate Documents Checklist

Have the following documents ready before beginning registrations:

- [ ] **1. Certificate of Incorporation / Partnership Deed / Shop & Establishment Certificate**
- [ ] **2. Business PAN Card**
- [ ] **3. GST Registration Certificate**
- [ ] **4. Cancelled Cheque / Latest Bank Statement (Current Account)**
- [ ] **5. Directors / Partners / Proprietor Identity Proof (PAN Card & Aadhaar)**
- [ ] **6. Business Website with mandatory legal policies published:**
  - [ ] Terms & Conditions
  - [ ] Privacy Policy
  - [ ] Refund & Cancellation Policy
  - [ ] Contact Us page with corporate physical address and email
- [ ] **7. Dedicated Mobile / Landline SIM** (for WhatsApp Cloud API setup)

---

## 5. Recommended 3-Phase Procurement Roadmap

```
+-----------------------------------------------------------------------------------+
| PHASE 1: IMMEDIATE / CURRENT (Active Development)                                 |
| - MOCK_MODE=true in .env                                                          |
| - Test OTP '123456' active for Flutter & Web frontend                             |
| - Zero expenditure; Zero vendor wait time                                         |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| PHASE 2: BUSINESS ONBOARDING (Week 1 - 2)                                         |
| 1. Submit Telecom DLT Registration (Jio/Airtel) -> ~3 days                       |
| 2. Submit Razorpay Merchant KYC -> ~3 days                                        |
| 3. Submit Meta Business Verification for WhatsApp -> ~4 days                      |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| PHASE 3: PRODUCTION LAUNCH (Week 3)                                               |
| 1. Subscribe to GoldAPI.io Starter ($10/mo)                                       |
| 2. Add Razorpay Live Keys & Fast2SMS Production Keys into .env                    |
| 3. Set MOCK_MODE=false on live server                                             |
| 4. End-to-end live testing with real 1-rupee transactions                         |
+-----------------------------------------------------------------------------------+
```

<div style="page-break-after: always;"></div>

---

## 6. Corresponding Environment (`.env`) Mapping

Once the accounts above are approved, update your production `.env` file:

```bash
# -----------------------------------------------------------------
# Core Application Configuration
# -----------------------------------------------------------------
PORT=5001
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/goldscheme_prod
JWT_ACCESS_SECRET=your_super_secure_access_secret_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_here
FIELD_ENCRYPTION_KEY=64_character_hex_string_for_aes_256_encryption

# -----------------------------------------------------------------
# Production Switch (Set to false for real transactions & real SMS)
# -----------------------------------------------------------------
MOCK_MODE=false
MOCK_OTP=

# -----------------------------------------------------------------
# 1. Fast2SMS / DLT SMS Configuration
# -----------------------------------------------------------------
FAST2SMS_API_KEY=your_live_fast2sms_api_key_here
FAST2SMS_SENDER_ID=SWRNBD
FAST2SMS_ROUTE=otp

# -----------------------------------------------------------------
# 2. Razorpay Live Payment Gateway Credentials
# -----------------------------------------------------------------
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_razorpay_secret_here
RAZORPAY_WEBHOOK_SECRET=your_live_webhook_secret_here

# -----------------------------------------------------------------
# 3. Meta WhatsApp Business API Credentials
# -----------------------------------------------------------------
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id_here
WHATSAPP_API_TOKEN=your_meta_system_user_permanent_token_here

# -----------------------------------------------------------------
# 4. Live Gold Rate Feed (GoldAPI.io)
# -----------------------------------------------------------------
GOLD_API_KEY=goldapi-xxxxxxxxxxxxxxxxxxxxxxxx-io

# -----------------------------------------------------------------
# 5. Automated KYC Verification (Surepass.io)
# -----------------------------------------------------------------
KYC_API_KEY=your_surepass_token_here

# -----------------------------------------------------------------
# 6. Google Firebase FCM (Push Notifications)
# -----------------------------------------------------------------
FIREBASE_PROJECT_ID=swarna-bindu-fcm
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@swarna-bindu-fcm.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 7. Next Actions & Support Contacts

For any questions regarding vendor technical integration or credentials configuration:
* **Engineering Team:** Bictree Technologies Development Team
* **Razorpay Merchant Support:** [support.razorpay.com](https://support.razorpay.com)
* **Meta WhatsApp Developer Support:** [developers.facebook.com/support](https://developers.facebook.com/support)
