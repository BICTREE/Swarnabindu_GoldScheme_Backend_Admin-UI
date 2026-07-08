# Swarna Bindu Gold Scheme REST API (Unified Backend)

A complete REST API backend for the **Swarna Bindu** Gold Scheme mobile application, built using **Node.js**, **Express**, and **MongoDB (Mongoose)**. This project includes both the **Client-Side** (user-facing) REST API and the **Admin-Side** (moderator/management) REST API, sharing the same database.

---

## 🛠️ Technology Stack
* **Node.js** (v18+)
* **Express.js** (routing and server layer)
* **MongoDB** & **Mongoose** (database and schemas modeling)
* **Multer** (document and photo file uploads)
* **JSON Web Tokens (JWT)** (Session security with Access & Refresh tokens, role claims)
* **Bcrypt.js** (admin passwords hashing)
* **Joi** (API contract input validations)
* **Express Rate Limit** (protection on sensitive endpoints)

---

## 📂 Directory Structure

```
├── config/
│   ├── db.js                 # MongoDB connection using Mongoose
│   └── rateLimiter.js        # Public route rate limiter configurations
├── controllers/
│   ├── authController.js     # Client OTP verification, Token refresh, & logout
│   ├── userController.js     # Client profile, KYC multi-step updates, & aggregation metrics
│   ├── schemeController.js   # Client schemes catalog browsing & enrollment/joining
│   ├── paymentController.js  # Client payments dues, initialized orders, & transaction verification
│   ├── goldController.js     # Client live gold rate feeds & redemption payouts
│   ├── notificationController.js # Client notification alerts list
│   └── admin/
│       ├── adminAuthController.js  # Admin login and moderator accounts creation
│       ├── adminUserController.js  # Admin users profile listing, bans, and KYC approvals
│       ├── adminSchemeController.js # Admin schemes catalog CRUD & user subscriptions view
│       ├── adminPaymentController.js # Admin transaction reviews & manual reconciliations
│       ├── adminGoldController.js    # Admin gold rate overrides
│       ├── adminNotificationController.js # Admin broadcasts & targeted push alerts
│       └── adminDashboardController.js  # Admin dashboard analytics stats & audit logs view
├── middleware/
│   ├── authMiddleware.js     # Client Bearer JWT access token protector
│   ├── roleMiddleware.js     # Admin JWT protector and role check middlewares
│   ├── errorMiddleware.js    # Global standardized JSON error formatter
│   ├── uploadMiddleware.js   # Multer file size & type validation
│   └── validationMiddleware.js # Sanitization & validation helper using Joi
├── models/
│   ├── User.js               # Client profile, KYC structures, and ban status
│   ├── Scheme.js             # Saving plan catalog templates
│   ├── UserScheme.js         # Subscribed scheme balances, targets, and dates
│   ├── Payment.js            # Transactions, installments, and invoicing details
│   ├── GoldRate.js           # Live rates tracking (22K per gram / 24K per 8 grams)
│   ├── Notification.js       # Log of alerts/push notification history
│   ├── RefreshToken.js       # JWT refresh token storage for session security
│   ├── AdminUser.js          # Admin credentials, roles, and status
│   └── AuditLog.js           # Admin action ledger tracking mutating operations
├── routes/
│   ├── client/
│   │   ├── authRoutes.js     # /api/v1/auth/...
│   │   ├── userRoutes.js     # /api/v1/user/...
│   │   ├── schemeRoutes.js   # /api/v1/schemes/...
│   │   ├── paymentRoutes.js  # /api/v1/payments/...
│   │   ├── goldRoutes.js     # /api/v1/gold-rate/... & /api/v1/gold/...
│   │   └── notificationRoutes.js # /api/v1/notifications/...
│   └── admin/
│       ├── adminAuthRoutes.js # /api/v1/admin/auth/...
│       ├── adminUserRoutes.js # /api/v1/admin/users/... & /api/v1/admin/kyc/...
│       ├── adminSchemeRoutes.js # /api/v1/admin/schemes/...
│       ├── adminPaymentRoutes.js # /api/v1/admin/payments/...
│       ├── adminGoldRoutes.js   # /api/v1/admin/gold-rate/...
│       ├── adminNotificationRoutes.js # /api/v1/admin/notifications/...
│       └── adminDashboardRoutes.js # /api/v1/admin/dashboard/... & /api/v1/admin/audit-logs
├── utils/
│   ├── helpers.js            # OTP generation, token utility, and audit logging
│   └── seed.js               # Database seeder (Schemes, Gold rates, Super Admin)
├── .env                      # App environment variables config
├── .gitignore                # Git exclude list
├── package.json              # Project dependencies & scripts
├── server.js                 # Express application entrypoint
├── test-api.js               # Client E2E programmatic integration test runner
├── test-admin-api.js         # Admin E2E programmatic integration test runner
└── README.md                 # Project documentation
```

---

## ⚙️ Local Setup Instructions

### 1. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/swarna_bindu
JWT_ACCESS_SECRET=swarna_bindu_access_secret_key_2026_xyz
JWT_REFRESH_SECRET=swarna_bindu_refresh_secret_key_2026_abc
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed the Database
Populates the database with initial schemes, rates, and creates the **Default Super Admin** account:
```bash
npm run seed
```
* **Default Super Admin Credentials:**
  * **Email:** `admin@swarnabindu.com`
  * **Password:** `admin123`

### 4. Start the Server
Run the Express application in development auto-reload mode (using `nodemon`):
```bash
npm run dev
```

---

## 👥 Admin Roles & Permissions

The admin-side API maps permissions to three roles:
1. **SUPER_ADMIN**: Full platform control. Only Super Admin can manage other admin users, retrieve Audit Logs, and manually reconcile failed transactions.
2. **MODERATOR**: Management capability. Can review/approve/reject client KYCs, mutate Schemes templates, override Gold Rates, and send announcements.
3. **SUPPORT**: Read-only capability. Can read user files, transaction logs, and catalogs to assist customer tickets.

---

## 🧪 Running Integration Verification Tests

Make sure the Express server is running on port 5001 before starting the test suites.

### Client API Integration Test
Tests onboarding, logins, KYC submissions, subscriptions, payments, rate changes, and redemption flows.
```bash
node test-api.js
```

### Admin API Integration Test
Tests admin login, creating moderators, reviewing and approving KYC, modifying schemes catalog, payment manual reconciliation, live gold rate overrides, broadcasts, statistics computation, and audit logs entries.
```bash
node test-admin-api.js
```

---

## 📡 REST API Endpoint Documentation

### Admin API Routes (`/api/v1/admin`)

#### Authentication & Management (`/admin/auth`)
* `POST /login`
  * Body: `{ "email": "admin@swarnabindu.com", "password": "admin123" }`
  * Returns: Admin details & JWT access token containing role claims.
* `POST /create-admin` (Super Admin Only)
  * Body: `{ "email": "...", "password": "...", "name": "...", "role": "MODERATOR" }`

#### User Management (`/admin/users` & `/admin/kyc`)
* `GET /users` (Super Admin, Moderator, Support) - Lists users (filters: `kycStatus`, `isBanned`, `search`).
* `GET /users/:id` (Super Admin, Moderator, Support) - Details of a user.
* `PUT /users/:id/ban` (Super Admin, Moderator) - Ban or unban a user.
* `GET /kyc/pending` (Super Admin, Moderator, Support) - Lists users with KYC status `SUBMITTED`.
* `POST /kyc/:id/approve` (Super Admin, Moderator) - Approves user KYC, logs action.
* `POST /kyc/:id/reject` (Super Admin, Moderator) - Rejects user KYC, logs action. Body: `{ "reason": "..." }`.

#### Schemes Catalog (`/admin/schemes`)
* `GET /` (Super Admin, Moderator, Support) - Lists schemes (active & inactive).
* `POST /` (Super Admin, Moderator) - Creates a new scheme template.
* `PUT /:id` (Super Admin, Moderator) - Updates scheme values.
* `DELETE /:id` (Super Admin, Moderator) - Toggles active status of a scheme.
* `GET /subscriptions` (Super Admin, Moderator, Support) - Lists user subscriptions (`UserScheme` records).

#### Payments & Financials (`/admin/payments` & `/admin/gold-rate`)
* `GET /payments` (Super Admin, Moderator, Support) - Lists payment transaction history.
* `POST /payments/:id/reconcile` (Super Admin Only) - Manually reconciles a pending payment, logs action, and credits gold to the client.
* `POST /gold-rate/update` (Super Admin, Moderator) - Set custom gold rates. Body: `{ "rate22K_per_g": 7200, "rate24K_per_8g": 60000 }`.

#### Analytics, Alerts & Diagnostics
* `GET /dashboard/stats` (Super Admin, Moderator, Support) - Aggregated stats (Signups, active schemes, total revenue collected, total gold liabilities).
* `GET /audit-logs` (Super Admin Only) - Lists all administrator activities (bans, overrides, approvals).
* `POST /notifications/broadcast` (Super Admin, Moderator) - Sends alert to all users.
* `POST /notifications/user/:userId` (Super Admin, Moderator) - Sends targeted alert to a single user.

---

### Client API Routes (`/api/v1`)

* `/auth/send-otp` / `/auth/verify-otp` / `/auth/refresh` / `/auth/logout` (Mobile OTP Authentication)
* `/user/profile` / `/user/kyc/personal` / `/user/kyc/identity` / `/user/kyc/address` / `/user/kyc/bank` / `/user/kyc/submit` / `/user/kyc/status` (Client multi-step KYC submission & profile)
* `/schemes` / `/schemes/my-schemes` / `/schemes/:id/join` (Browse and enroll in schemes)
* `/payments/dues` / `/payments/initialize` / `/payments/verify` / `/payments/history` / `/payments/receipt/:transactionId` (Installment calculations and payments)
* `/gold-rate/today` (Live rate monitoring)
* `/gold/redeem` (Cash payout redemptions)
* `/notifications` / `/notifications/register-device` (Client push alerts)

---

## 📇 Postman Integration Collection

We have generated a unified Postman Collection and synced it directly to your Postman account:
* **Postman Workspace**: **Bictree**
* **Collection Name**: `Swarna Bindu Gold Scheme REST API`
* **Collection UID**: `27694916-ab4eea52-b6cd-492b-bb24-27c8eef4641c`
* **Local Export File**: [Swarna_Bindu_Gold_Scheme_API.postman_collection.json](file:///Users/abinschandran/Developments/Company/Bictree/Bictree/Swarnabindu_GoldScheme/Swarna_Bindu_Gold_Scheme_API.postman_collection.json) (located at the root of the workspace).

### Key Features
* **Strict Separation**: Separates the API requests into two folders: **Client API Flow** and **Admin API Flow** to allow frontend and dashboard developers to work independently without mixing endpoints.
* **Auto-Token Scripting**: On the client's `Verify OTP` request and the admin's `Admin Login` request, a post-response script automatically parses the returned JWT access token and saves it in the collection variables (`clientToken` / `adminToken`). Subsequent requests load these variables automatically, preventing the need to manually copy-paste auth tokens.
* **Saved Mock Responses**: Each request includes saved JSON schemas and body responses representing successful responses (200/201) and errors (400/401/403/404) for developer reference.

### How to Import and Run
1. Open Postman.
2. Click **Import** and select the [Swarna_Bindu_Gold_Scheme_API.postman_collection.json](file:///Users/abinschandran/Developments/Company/Bictree/Bictree/Swarnabindu_GoldScheme/Swarna_Bindu_Gold_Scheme_API.postman_collection.json) file.
3. Collection variables are pre-configured:
   * `baseUrl`: Defaults to `http://localhost:5001/api/v1` (adjust if your local server runs on a different port).
   * `clientToken` and `adminToken`: Automatically populated upon running logins.
4. Set up your local MongoDB, run `npm run seed` and `npm run dev` to start the server.
5. In the **Admin API Flow** folder:
   * Run the **Admin Login** request with the seeded Super Admin credentials to obtain `adminToken` automatically.
6. In the **Client API Flow** folder:
   * Run the **Send OTP** request for a mobile number.
    * Run the **Verify OTP** request with OTP `123456` (our testing static bypass code) to obtain `clientToken` and `clientRefreshToken` automatically.

---

## ⚖️ Compliance Notes (DPDP, Aadhaar, PMLA)

This backend implements first-class support for Indian data regulations. The architecture incorporates security baselines and data governance workflows by design.

> [!IMPORTANT]
> **LEGAL DISCLAIMER & PREREQUISITES**
>
> While this codebase implements programmatic controls for regulatory alignment, **software alone does not guarantee legal compliance**. Before going live, you must consult qualified legal counsel and compliance officers to review and authorize the following parameters:
>
> 1. **Chit Fund / Deposit-Taking Classification**: The financial structure of this gold scheme must be audited to determine if it falls under the *Chit Funds Act, 1982*, the *Banning of Unregulated Deposit Schemes Act, 2019 (BUDS)*, or state-specific gold savings rules.
> 2. **Aadhaar Licensing (UIDAI)**: Conducting Aadhaar OTP or biometric authentication in production requires obtaining a Sub-KUA or KUA license from the Unique Identification Authority of India (UIDAI) or routing requests through an authorized licensed partner.
> 3. **Exact Retention Timelines**: The compliance retention and purge schedules must be audited against local tax and corporate filing guidelines.

### Programmatic Policies Implemented

#### 1. DPDP Act, 2023 Compliance
* **Explicit Non-Bundled Consent**: Consents are logged individually per purpose (`KYC`, `BIOMETRIC`, `MARKETING`) in `models/Consent.js` with active/withdrawn timestamps, IP address, and user agent records.
* **Right to Access (Portability)**: Out-of-the-box data portability export endpoint serves all profile, consent history, payments, and grievance tickets in standard JSON.
* **Right to Erasure (PMLA Overriding)**: Users can request data erasure. If transaction history exists, the PII fields (name, email, bank details, phone) are immediately anonymized and the profile is locked, while minimal metadata is archived for exactly **5 years** to satisfy PMLA obligations before final purge.
* **Grievance SLA**: Grievance tickets automatically compute a strict **90-day SLA window** under DPDP requirements.

#### 2. Aadhaar Act, 2016 Guidelines
* **No Plaintext Aadhaar Storage**: The full 12-digit Aadhaar number is encrypted at rest using AES-256-CBC and stored in a restricted field. Only the last 4 digits are cached as plaintext (`aadhaarLast4`) to support query lookups.
* **Authorized Document Gateway**: Aadhaar front, Aadhaar back, and PAN document image files are restricted from public folder paths. They are served via a secure stream controller (`/api/v1/admin/compliance/media/:userId/:fileType`) that authorizes the administrator session, verifies `view:kyc:full` role claims, and logs the access event in the audit trail.

#### 3. PII & Financial Data Security
* **Field-Level Encryption at Rest**: PAN card numbers, bank account numbers, and UPI IDs are symmetrically encrypted at rest.
* **Outbound Masking Middleware**: The Express pipeline registers a global outbound response masker (`middleware/maskingMiddleware.js`). It automatically intercepts all JSON results, masking sensitive fields (e.g. `******4321` for account numbers) unless requested by a role with explicit permissions (`view:kyc:full` or `view:bank:full`), logging all full views.
* **Biometric Selfie Expiry**: Biometric selfies have a shorter retention window (default 90 days after successful verification) and are automatically deleted by the cron job.

#### 4. Data Localization & Incident Logs
* **Mumbai AWS Region Routing**: The backend is configured to connect to standard MongoDB clusters without hardcoding, allowing pointing to India-region clusters (e.g. AWS `ap-south-1`) to comply with localized data residency mandates.
* **CERT-In Breach Logs**: Super admins can log and audit database security incidents and data breaches, facilitating CERT-In reporting compliance.
* **Daily Purge Cron**: A background task runner (`utils/retentionCron.js`) sweeps Mongoose daily, identifying and deleting expired profiles and biometric files.
