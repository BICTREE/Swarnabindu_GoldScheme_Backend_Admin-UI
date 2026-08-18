# Swarnabindu Gold Scheme — Flutter Developer Integration Guide
### KYC, Authentication & Environment Modes (`MOCK_MODE=true` vs `MOCK_MODE=false`)

---

## 1. Overview & Operational Modes

The Swarnabindu Gold Scheme Backend operates in two environment modes configured on the server via `.env`:

| Feature | Mock Mode (`MOCK_MODE=true`) | Real / Production Mode (`MOCK_MODE=false`) |
| :--- | :--- | :--- |
| **Authentication OTP** | Sent to server console (or standard mock OTP `123456`). No SMS cost. | Real 6-digit OTP delivered via SMS gateway (Fast2SMS / Twilio). |
| **KYC Verification** | **Automated 10-Second Auto-Approval**. Auto-approves without manual admin intervention. | **Human Admin Review**. Submission stays in `SUBMITTED` until Admin approves or rejects. |
| **Admin References** | `moderatedBy` & `moderatedAt` remain `null` during auto-approval. | `moderatedBy` (Admin ID) and `moderatedAt` are recorded on approval/rejection. |
| **Push Notifications** | Logged to Database (`Notification` collection) & printed to backend log. | Delivered to physical mobile devices via Firebase Cloud Messaging (FCM). |
| **Payment Gateway** | Mock Razorpay signatures and instant test capture. | Real Razorpay Checkout SDK integration & live webhook signatures. |

---

## 2. Base Configuration & Headers

### Base URL
* **Local Android Emulator**: `http://10.0.2.2:5001/api/v1`
* **Local iOS Simulator**: `http://127.0.0.1:5001/api/v1`
* **Physical Device (Local Network)**: `http://<YOUR_LOCAL_IP>:5001/api/v1`
* **Production/Staging Server**: `https://api.swarnabindu.com/api/v1`

### Required HTTP Headers
* **Standard JSON Requests**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <accessToken>
  ```
* **Multipart File Uploads** (Step 1, 2 & 5 of KYC):
  ```http
  Content-Type: multipart/form-data
  Authorization: Bearer <accessToken>
  ```

---

## 3. KYC Status Lifecycle

```
[ PENDING ] ───(Complete Steps 1-4)───> [ PENDING ] ───(Step 5 Upload Selfie)───> [ SUBMITTED ]
                                                                                      │
                           ┌──────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┐
                           │                                                                                                                  │
             MOCK_MODE=true (Sandbox Auto-Approval)                                                            MOCK_MODE=false (Production Admin Review)
                           │                                                                                                                  │
            [ Automatically Approved in 10 Sec ]                                                                   [ Admin Reviews Submission ]
                           │                                                                                                                  │
                           ▼                                                                                            ┌─────────────────────┴─────────────────────┐
                       APPROVED                                                                                         │                                           │
                                                                                                                   APPROVED                                      REJECTED
                                                                                                         (Can subscribe to schemes)                    (Allows Re-uploading)
```

### KYC Status Enum Values
- `PENDING`: Default state for newly registered accounts.
- `SUBMITTED`: Steps 1–5 submitted; awaiting verification.
- `APPROVED`: Verified account. User can subscribe to Gold Schemes.
- `REJECTED`: Submission rejected. `rejectedReason` available in profile/status response.

---

## 4. Step-by-Step API Integration Walkthrough

### Step 0: Check KYC Status
* **Endpoint**: `GET /api/v1/user/kyc/status`
* **Response**:
```json
{
  "success": true,
  "message": "KYC status retrieved successfully",
  "errorCode": null,
  "data": {
    "kycStatus": "PENDING",
    "rejectedReason": null,
    "lastSyncedAt": "2026-08-13T14:00:00.000Z"
  }
}
```

---

### Step 1: Personal Information
* **Endpoint**: `PUT /api/v1/user/kyc/personal` (`multipart/form-data`)
* **Fields**:
  - `fullName` (String, Required)
  - `dob` (String `YYYY-MM-DD`, Required)
  - `gender` (String `'Male'|'Female'|'Other'`, Required)
  - `email` (String, Required)
  - `profilePicture` (File, Optional)

---

### Step 2: Identity Documents Verification
* **Endpoint**: `PUT /api/v1/user/kyc/identity` (`multipart/form-data`)
* **Fields**:
  - `aadhaarNumber` (String 12 digits, Required)
  - `panNumber` (String 10 chars format `ABCDE1234F`, Required)
  - `aadhaarFront` (File, Required)
  - `aadhaarBack` (File, Required)
  - `panCardPhoto` (File, Required)

---

### Step 3: Address Information
* **Endpoint**: `PUT /api/v1/user/kyc/address` (`application/json`)
* **Body**:
```json
{
  "houseName": "Swarna Villa",
  "street": "MG Road",
  "landmark": "Near Central Bank",
  "city": "Trivandrum",
  "district": "Thiruvananthapuram",
  "state": "Kerala",
  "pinCode": "695001",
  "latitude": 8.5241,
  "longitude": 76.9366
}
```

---

### Step 4: Bank Details Verification
* **Endpoint**: `PUT /api/v1/user/kyc/bank` (`application/json`)
* **Body**:
```json
{
  "accountHolderName": "John Doe",
  "bankName": "State Bank of India",
  "accountNumber": "123456789012",
  "ifscCode": "SBIN0001234",
  "branchName": "Main Branch",
  "upiId": "johndoe@upi"
}
```

---

### Step 5: Final Selfie Upload & KYC Submission
* **Endpoint**: `POST /api/v1/user/kyc/submit` (`multipart/form-data`)
* **Fields**:
  - `selfie` (File, Required)
* **Response**:
```json
{
  "success": true,
  "message": "KYC documents submitted successfully. Status set to SUBMITTED.",
  "errorCode": null,
  "data": {
    "kycStatus": "SUBMITTED",
    "selfieDetails": {
      "selfiePath": "/uploads/selfies/selfie-172356789.jpg",
      "capturedAt": "2026-08-13T14:30:00.000Z"
    }
  }
}
```

---

## 5. Flutter Mobile App Handling Strategy

### Handling `MOCK_MODE=true` (Auto-Approval Sandbox)
In Mock Mode, after calling `POST /api/v1/user/kyc/submit`:
1. The server returns status `SUBMITTED`.
2. The Flutter app displays a **"Verifying your details..."** screen with a spinner.
3. The Flutter app polls `GET /api/v1/user/kyc/status` every **3 seconds** (or listens to FCM notification).
4. After **10 seconds**, the backend background timer sets `kycStatus = 'APPROVED'`.
5. On the next status poll, `kycStatus` will be `'APPROVED'`, and the app navigates to the **Success / Scheme Catalog Screen**.

### Handling `MOCK_MODE=false` (Production Admin Review)
In Real Production Mode, after calling `POST /api/v1/user/kyc/submit`:
1. The server returns status `SUBMITTED`.
2. The Flutter app displays an **"Under Admin Review"** status card.
3. The user can navigate away.
4. When an Admin approves/rejects the KYC via the Admin Portal, an FCM Push Notification (`type: 'KYC_STATUS'`) is sent to the Flutter app.
5. If **APPROVED**: App unlocks Scheme Subscriptions.
6. If **REJECTED**: App displays the rejection reason (`rejectedReason`) and shows an **"Edit & Re-submit KYC"** button.

---

## 6. Flutter Dart Code Implementation Examples

### Multipart Form Upload Helper (Dio Example)

```dart
import 'package:dio/dio.dart';

class KycRepository {
  final Dio _dio;

  KycRepository(this._dio);

  /// Submit Step 5 - Selfie & Trigger Submission
  Future<Map<String, dynamic>> submitKyc({
    required String selfieFilePath,
    required String accessToken,
  }) async {
    final formData = FormData.fromMap({
      'selfie': await MultipartFile.fromFile(
        selfieFilePath,
        filename: 'selfie.jpg',
      ),
    });

    final response = await _dio.post(
      '/user/kyc/submit',
      data: formData,
      options: Options(
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'multipart/form-data',
        },
      ),
    );

    return response.data;
  }

  /// Poll KYC Status
  Future<String> checkKycStatus(String accessToken) async {
    final response = await _dio.get(
      '/user/kyc/status',
      options: Options(
        headers: {'Authorization': 'Bearer $accessToken'},
      ),
    );
    return response.data['data']['kycStatus'];
  }
}
```

### Auto-Approval Polling Widget Example (Mock Sandbox Mode)

```dart
void pollForMockApproval(String token) async {
  int attempts = 0;
  Timer.periodic(const Duration(seconds: 3), (timer) async {
    attempts++;
    final status = await kycRepo.checkKycStatus(token);
    
    if (status == 'APPROVED') {
      timer.cancel();
      // Navigate to Scheme Catalog
      Navigator.pushReplacementNamed(context, '/schemes');
    } else if (status == 'REJECTED') {
      timer.cancel();
      // Show Rejection Reason
      showRejectionDialog();
    } else if (attempts > 10) { 
      // Stop polling after 30s if still pending (e.g. in real mode)
      timer.cancel();
    }
  });
}
```

---

## 7. Error Codes to Handle in Flutter

| Error Code | HTTP Status | Description | User Action Required |
| :--- | :--- | :--- | :--- |
| `KYC_REQUIRED` | `400 Bad Request` | User attempted to subscribe to a Gold Scheme without `APPROVED` status. | Prompt user to complete KYC. |
| `INCOMPLETE_KYC_STEPS` | `400 Bad Request` | Step 5 submitted before Steps 1–4 are complete. | Redirect to incomplete step. |
| `SELFIE_REQUIRED` | `400 Bad Request` | Selfie photo file missing in Step 5. | Re-open camera capture. |
| `INVALID_OTP` | `400 Bad Request` | OTP verification failed. | Prompt user to re-enter OTP. |
