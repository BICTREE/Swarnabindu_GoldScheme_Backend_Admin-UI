# KYC Unified Submit API — `POST /api/v1/user/kyc/submit-full`

> **Added in**: KYC Optimization — August 2026  
> **Controller**: `controllers/userController.js → submitKycFull`  
> **Route file**: `routes/client/userRoutes.js`

---

## Overview

Replaces the original 5-step KYC API flow with a **single `multipart/form-data` request** that submits all personal, identity, address, bank and biometric (selfie) data at once.

### Before (5 round-trips)

```
PUT  /api/v1/user/kyc/personal    ← personal info + profile picture
PUT  /api/v1/user/kyc/identity    ← aadhaar / PAN + 3 document images
PUT  /api/v1/user/kyc/address     ← address fields
PUT  /api/v1/user/kyc/bank        ← bank account details
POST /api/v1/user/kyc/submit      ← selfie + final submission trigger
```

### After (1 round-trip)

```
POST /api/v1/user/kyc/submit-full ← everything in one request
```

> **Note:** The original 5 step-by-step routes are **still available and unchanged**. Use them for partial/draft saves or when the mobile UI collects data incrementally across screens.

---

## Endpoint Details

| Property      | Value |
|---------------|-------|
| **Method**    | `POST` |
| **URL**       | `/api/v1/user/kyc/submit-full` |
| **Auth**      | Bearer token (JWT) — `Authorization: Bearer <token>` |
| **Body type** | `multipart/form-data` |
| **Access**    | Private (authenticated users only) |

---

## Request Fields

### 📋 Personal Information

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `fullName` | `string` | ✅ | Min 2 characters |
| `dob` | `string` (ISO date) | ✅ | Valid ISO date, e.g. `1995-06-15` |
| `gender` | `string` | ✅ | One of: `Male`, `Female`, `Other` |
| `email` | `string` | ✅ | Valid email format |
| `profilePicture` | `file` (image) | ❌ | JPEG / JPG / PNG, max 5 MB |

### 🪪 Identity Verification

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `aadhaarNumber` | `string` | ✅ | Exactly 12 digits |
| `panNumber` | `string` | ✅ | Format: `ABCDE1234F` |
| `digiLockerConnected` | `boolean` / `"true"/"false"` | ❌ | Defaults to `false` |
| `aadhaarFront` | `file` (image) | ❌ | JPEG / JPG / PNG, max 5 MB |
| `aadhaarBack` | `file` (image) | ❌ | JPEG / JPG / PNG, max 5 MB |
| `panCardPhoto` | `file` (image) | ❌ | JPEG / JPG / PNG, max 5 MB |

### 🏠 Address Information

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `houseName` | `string` | ✅ | Non-empty |
| `street` | `string` | ✅ | Non-empty |
| `landmark` | `string` | ❌ | Optional |
| `city` | `string` | ✅ | Non-empty |
| `district` | `string` | ✅ | Non-empty |
| `state` | `string` | ✅ | Non-empty |
| `pinCode` | `string` | ✅ | Exactly 6 digits |
| `latitude` | `number` | ❌ | GPS latitude |
| `longitude` | `number` | ❌ | GPS longitude |

### 🏦 Bank Details

| Field | Type | Required | Validation |
|-------|------|:--------:|-----------|
| `accountHolderName` | `string` | ✅ | Non-empty |
| `bankName` | `string` | ✅ | Non-empty |
| `accountNumber` | `string` | ✅ | 9–18 characters |
| `confirmAccountNumber` | `string` | ✅ | Must match `accountNumber` |
| `ifscCode` | `string` | ✅ | e.g. `UTIB0001234` |
| `branchName` | `string` | ✅ | Non-empty |
| `upiId` | `string` | ❌ | Optional UPI handle |

### 🤳 Biometric

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| `selfie` | `file` (image) | ✅ | Live selfie, JPEG/JPG/PNG, max 5 MB. Submission is blocked without this. |

---

## Processing Flow

```
Request received
    │
    ├─ 1. Validate personalInfo     (Joi schema)
    ├─ 2. Validate identityInfo     (Joi schema)
    ├─ 3. Validate addressInfo      (Joi schema)
    ├─ 4. Validate bankDetails      (Joi schema)
    ├─ 5. Assert selfie file exists
    │
    ├─ 6. User.findById(req.user.id)
    │       ├─ Write personalInfo sub-document
    │       ├─ Write identityVerification sub-document + file paths
    │       ├─ Write addressInfo sub-document
    │       ├─ Write bankDetails sub-document
    │       └─ Write selfieVerification sub-document
    │
    ├─ 7. kycStatus = 'SUBMITTED'
    │     user.save()  ← SINGLE DB write
    │
    ├─ 8. Send "KYC Received" push notification
    └─ 9. Schedule auto-approval after 10 s (dev sandbox only)
```

> **Security note:** Sensitive fields (`aadhaarNumber`, `panNumber`, `accountNumber`, `upiId`) are **automatically encrypted at rest** by the `User` model's `pre('save')` hook. The API response returns `aadhaarLast4` and `accountLast4` — never full plaintext values.

---

## Success Response — `200 OK`

```json
{
  "success": true,
  "message": "KYC submitted successfully in a single request. Status set to SUBMITTED.",
  "errorCode": null,
  "data": {
    "kycStatus": "SUBMITTED",
    "personalInfo": {
      "fullName": "Ravi Kumar",
      "dob": "1995-06-15T00:00:00.000Z",
      "gender": "Male",
      "email": "ravi@example.com",
      "profilePicture": "/uploads/profiles/profilePicture-<userId>-<ts>.jpg"
    },
    "identityVerification": {
      "aadhaarLast4": "4567",
      "panNumber": "ABCDE1234F",
      "digiLockerConnected": false,
      "aadhaarFront": "/uploads/kyc/aadhaarFront-<userId>-<ts>.jpg",
      "aadhaarBack": "/uploads/kyc/aadhaarBack-<userId>-<ts>.jpg",
      "panCardPhoto": "/uploads/kyc/panCardPhoto-<userId>-<ts>.jpg"
    },
    "addressInfo": {
      "houseName": "Green Villa",
      "street": "MG Road",
      "landmark": "Near KSRTC Bus Stand",
      "city": "Thrissur",
      "district": "Thrissur",
      "state": "Kerala",
      "pinCode": "680001",
      "locationCoordinates": {
        "type": "Point",
        "coordinates": [76.2144, 10.5276]
      }
    },
    "bankDetails": {
      "accountHolderName": "Ravi Kumar",
      "bankName": "State Bank of India",
      "accountLast4": "9012",
      "ifscCode": "SBIN0001234",
      "branchName": "Thrissur Main Branch"
    },
    "selfieDetails": {
      "selfiePath": "/uploads/selfies/selfie-<userId>-<ts>.jpg",
      "capturedAt": "2026-08-18T08:00:00.000Z",
      "dataRetentionExpiry": null
    }
  }
}
```

---

## Error Responses

### `400` — Validation Error

The `message` is prefixed with the failing section name for easy client-side debugging.

```json
{
  "success": false,
  "message": "Personal info: \"fullName\" is required",
  "errorCode": "VALIDATION_ERROR",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Identity info: Aadhaar number must contain exactly 12 digits",
  "errorCode": "VALIDATION_ERROR",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Bank details: Account number and confirmation account number must match",
  "errorCode": "VALIDATION_ERROR",
  "data": null
}
```

### `400` — Selfie Missing

```json
{
  "success": false,
  "message": "Selfie capture is required to submit KYC",
  "errorCode": "SELFIE_REQUIRED",
  "data": null
}
```

### `401` — Unauthorized

```json
{
  "success": false,
  "message": "Not authorized, token failed",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```

### `404` — User Not Found

```json
{
  "success": false,
  "message": "User profile not found",
  "errorCode": "USER_NOT_FOUND",
  "data": null
}
```

---

## File Upload Rules

| Rule | Limit |
|------|-------|
| Accepted formats | `image/jpeg`, `image/jpg`, `image/png` |
| Max file size per file | **5 MB** |
| Max files per request | **5** (one per field) |
| Storage — profile picture | `uploads/profiles/` |
| Storage — KYC documents | `uploads/kyc/` |
| Storage — selfie | `uploads/selfies/` |
| Filename pattern | `<fieldname>-<userId>-<timestamp>-<random>.<ext>` |

---

## KYC Status Lifecycle

```
PENDING ──► SUBMITTED ──► APPROVED
                     └──► REJECTED
```

- This endpoint transitions the user's `kycStatus` from `PENDING` → `SUBMITTED`.
- In the **dev sandbox**, KYC auto-approves to `APPROVED` after 10 seconds.
- In production, an admin reviews via the Admin panel and sets `APPROVED` or `REJECTED`.

---

## Example — cURL

```bash
curl -X POST https://<host>/api/v1/user/kyc/submit-full \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "fullName=Ravi Kumar" \
  -F "dob=1995-06-15" \
  -F "gender=Male" \
  -F "email=ravi@example.com" \
  -F "aadhaarNumber=123456789012" \
  -F "panNumber=ABCDE1234F" \
  -F "digiLockerConnected=false" \
  -F "houseName=Green Villa" \
  -F "street=MG Road" \
  -F "landmark=Near KSRTC Bus Stand" \
  -F "city=Thrissur" \
  -F "district=Thrissur" \
  -F "state=Kerala" \
  -F "pinCode=680001" \
  -F "latitude=10.5276" \
  -F "longitude=76.2144" \
  -F "accountHolderName=Ravi Kumar" \
  -F "bankName=State Bank of India" \
  -F "accountNumber=123456789012" \
  -F "confirmAccountNumber=123456789012" \
  -F "ifscCode=SBIN0001234" \
  -F "branchName=Thrissur Main Branch" \
  -F "upiId=ravi@upi" \
  -F "profilePicture=@/path/to/photo.jpg" \
  -F "aadhaarFront=@/path/to/aadhaar_front.jpg" \
  -F "aadhaarBack=@/path/to/aadhaar_back.jpg" \
  -F "panCardPhoto=@/path/to/pan.jpg" \
  -F "selfie=@/path/to/selfie.jpg"
```

---

## Migration Guide — Replacing the 5-Step Flow

```diff
- await api.put('/user/kyc/personal',  personalFormData);
- await api.put('/user/kyc/identity',  identityFormData);
- await api.put('/user/kyc/address',   addressPayload);
- await api.put('/user/kyc/bank',      bankPayload);
- await api.post('/user/kyc/submit',   selfieFormData);
+ await api.post('/user/kyc/submit-full', combinedFormData);
```

**Assembling `combinedFormData` (Flutter / Dart — Dio example):**

```dart
final formData = FormData.fromMap({
  // Text fields
  'fullName':             fullName,
  'dob':                  dob,               // "1995-06-15"
  'gender':               gender,
  'email':                email,
  'aadhaarNumber':        aadhaarNumber,
  'panNumber':            panNumber,
  'digiLockerConnected':  'false',
  'houseName':            houseName,
  'street':               street,
  'city':                 city,
  'district':             district,
  'state':                state,
  'pinCode':              pinCode,
  'accountHolderName':    accountHolderName,
  'bankName':             bankName,
  'accountNumber':        accountNumber,
  'confirmAccountNumber': accountNumber,
  'ifscCode':             ifscCode,
  'branchName':           branchName,

  // File fields
  'profilePicture': await MultipartFile.fromFile(profilePicPath),
  'aadhaarFront':   await MultipartFile.fromFile(aadhaarFrontPath),
  'aadhaarBack':    await MultipartFile.fromFile(aadhaarBackPath),
  'panCardPhoto':   await MultipartFile.fromFile(panPath),
  'selfie':         await MultipartFile.fromFile(selfiePath),
});

final response = await dio.post('/api/v1/user/kyc/submit-full', data: formData);
```

---

## Related Files

| File | Role |
|------|------|
| `controllers/userController.js` | Handler: `submitKycFull` |
| `routes/client/userRoutes.js` | Route: `POST /kyc/submit-full` |
| `middleware/uploadMiddleware.js` | Multer config — storage, filter, 5 MB limit |
| `models/User.js` | Mongoose schema + pre-save encryption hooks |
| `utils/helpers.js` | `sendMockNotification` utility |
