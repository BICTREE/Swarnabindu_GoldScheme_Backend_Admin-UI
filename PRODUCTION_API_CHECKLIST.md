# 🛒 Production Third-Party APIs & Services Checklist

This document provides a comprehensive list of all **Third-Party APIs, Services, and Cloud Infrastructure** required to run the **Swarna Bindu Gold Scheme** platform live in Production.

---

## 💳 1. MUST-HAVE (Primary Paid APIs)

| Service Category | Recommended Provider(s) | Primary Purpose in App | Pricing Model (Approx in India) | `.env` Variable |
|---|---|---|---|---|
| **1. Payment Gateway** | **Razorpay** *(Recommended)*<br>• Cashfree<br>• PhonePe Gateway | Processing monthly scheme installments via UPI, Debit Card, Net Banking. | ~1.5% to 2% per transaction fee. | `RAZORPAY_KEY_ID`<br>`RAZORPAY_KEY_SECRET` |
| **2. OTP SMS Gateway** | **Fast2SMS** *(Recommended)*<br>• MSG91<br>• Textlocal | Sending 6-digit OTPs for mobile login verification. | ~₹0.15 to ₹0.25 per OTP SMS. | `FAST2SMS_API_KEY`<br>`FAST2SMS_SENDER_ID` |
| **3. WhatsApp Business API** | **Meta Cloud API** *(Direct)*<br>• Interakt<br>• Wati | Sending payment receipts, installment due reminders, & scheme confirmations. | ~₹0.30 - ₹0.75 per utility message. | `WHATSAPP_PHONE_NUMBER_ID`<br>`WHATSAPP_API_TOKEN` |
| **4. Live Gold Rate Feed** | **GoldAPI.io** *(Recommended)*<br>• MetalpriceAPI<br>• IBJA API | Fetching real-time 22K (per gram) & 24K (per 8g) gold market prices. | Free tier available; Paid ~$10–$29/month. | `GOLD_API_KEY` |
| **5. Automated KYC Verification** | **Surepass.io** *(Recommended)*<br>• Cashfree Verification<br>• Signzy / Karza | Instant verification of PAN card, Aadhaar, and Bank Account Name (Penny Drop). | ~₹1 - ₹3 per API verification call. | `KYC_API_KEY` |

---

## 🆓 2. FREE ESSENTIAL SERVICES (No Purchase Needed)

| Service | Provider | Purpose | Cost | `.env` Variable |
|---|---|---|---|---|
| **Push Notifications** | **Google Firebase FCM** | Sending in-app push alerts & reminders to Android / iOS devices. | **100% FREE** | `FIREBASE_PROJECT_ID`<br>`FIREBASE_PRIVATE_KEY` |

---

## ☁️ 3. CLOUD INFRASTRUCTURE (Server & Database)

| Category | Recommended Provider | Purpose | Estimated Cost | `.env` Variable |
|---|---|---|---|---|
| **Database** | **MongoDB Atlas** | Managed MongoDB cloud cluster for encrypted user profiles & payments. | Free tier available; ~$10 - $25/mo when scaling. | `MONGODB_URI` |
| **Node.js Backend Hosting** | **Vercel** / **AWS EC2** / **DigitalOcean** | Hosting the Express REST API backend. | Free on Vercel; ~$6 - $12/mo on DigitalOcean. | `PORT`, `NODE_ENV` |
| **File Storage (Photos & Documents)** | **AWS S3** / Local Server Disk | Storing uploaded Aadhaar, PAN photos, profile pictures, and selfies. | Free tier; ~$1 - $3/mo on AWS S3. | Defaults to `/uploads` directory |

---

## 📋 Recommended Registration Order for Launch

1. **Step 1: Razorpay Merchant Account**
   * Register on [Razorpay.com](https://razorpay.com). Business KYC takes 2–3 days for approval.
2. **Step 2: Fast2SMS / MSG91**
   * Register on [Fast2SMS.com](https://www.fast2sms.com) and complete DLT registration for OTP templates.
3. **Step 3: Meta WhatsApp Business API**
   * Register on [developers.facebook.com](https://developers.facebook.com) or use an aggregator like [Interakt.shop](https://www.interakt.shop).
4. **Step 4: GoldAPI.io**
   * Register on [GoldAPI.io](https://www.goldapi.io) to obtain a live gold price feed key.
