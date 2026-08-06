# 🔒 Flutter Session Handling & Token Management Guide
**Swarnabindu Gold Scheme REST API**

This document specifies the exact session handling architecture, token lifecycle, and client-side implementation requirements for integrating the **Flutter Mobile App** with the Swarnabindu Gold Scheme Node.js backend.

---

## 1. Overview of Session Architecture

The Swarnabindu Gold Scheme backend uses an **OAuth 2.0 / JWT Double-Token Strategy**:

| Token Type | Lifetime | Storage Location | Primary Purpose |
|---|---|---|---|
| **Access Token (`accessToken`)** | `15 minutes` | Flutter Secure Storage | Authenticates every HTTP request in `Authorization: Bearer <accessToken>` header. |
| **Refresh Token (`refreshToken`)** | `7 days` | Flutter Secure Storage & Backend MongoDB DB | Used exclusively to obtain a new `accessToken` when the current one expires. |

---

## 2. API Endpoints for Session Management

### 2.1 OTP Verification / Login (Obtain Initial Tokens)
* **Endpoint:** `POST /api/v1/auth/verify-otp`
* **Access:** Public
* **Response Body:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "errorCode": null,
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

---

### 2.2 Access Token Refresh
* **Endpoint:** `POST /api/v1/auth/refresh`
* **Access:** Public
* **Request Body:**
```json
{
  "refreshToken": "<stored_refresh_token>"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "errorCode": null,
  "data": {
    "accessToken": "eyJhbGciOi..."
  }
}
```
* **Failure Responses (401 Unauthorized):**
  * `errorCode: "INVALID_REFRESH_TOKEN"` — Token not found in MongoDB database.
  * `errorCode: "REFRESH_TOKEN_EXPIRED"` — 7 days limit exceeded. User must log in again with OTP.

---

### 2.3 Logout / Revoke Session
* **Endpoint:** `POST /api/v1/auth/logout`
* **Access:** Public
* **Request Body:**
```json
{
  "refreshToken": "<stored_refresh_token>"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "errorCode": null,
  "data": null
}
```
*(Backend deletes the refresh token record from MongoDB, preventing any further access token renewals).*

---

## 3. Backend Error Code Taxonomy

The backend returns standardized `401 Unauthorized` responses. The Flutter app must handle these specific `errorCode` values:

| Error Code | HTTP Status | Trigger Condition | Required Flutter Action |
|---|---|---|---|
| `TOKEN_EXPIRED` | `401` | 15-minute Access Token has expired. | **Automatic Interceptor Call:** Call `/api/v1/auth/refresh` to get a new `accessToken`, then retry original request. |
| `INVALID_REFRESH_TOKEN` | `401` | Refresh token was revoked or tampered with. | **Logout User:** Clear secure storage & navigate to OTP Login screen. |
| `REFRESH_TOKEN_EXPIRED` | `401` | 7 days session limit passed. | **Logout User:** Display session expired notification & navigate to OTP Login screen. |
| `NO_TOKEN` | `401` | Missing `Authorization` header. | **Request Error:** Ensure header `Authorization: Bearer <accessToken>` is included. |
| `USER_NOT_FOUND` | `401` | User account deleted or deactivated. | **Logout User:** Clear secure storage & navigate to OTP Login screen. |

---

## 4. Flutter Client-Side Implementation Requirements

### Requirement 1: Secure Storage
Flutter must use `flutter_secure_storage` (iOS Keychain / Android EncryptedSharedPreferences) to store tokens. **Do NOT use `shared_preferences` for JWT tokens.**

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage();

  static Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: 'accessToken', value: accessToken);
    await _storage.write(key: 'refreshToken', value: refreshToken);
  }

  static Future<String?> getAccessToken() async => await _storage.read(key: 'accessToken');
  static Future<String?> getRefreshToken() async => await _storage.read(key: 'refreshToken');
  
  static Future<void> clear() async {
    await _storage.deleteAll();
  }
}
```

---

### Requirement 2: Automatic Dio Refresh Interceptor (Copy & Paste Ready)

Implement a custom `Dio` Interceptor to handle transparent token renewal when a `401` with `TOKEN_EXPIRED` occurs:

```dart
import 'package:dio/dio.dart';

class ApiClient {
  final Dio dio = Dio(BaseOptions(
    baseUrl: 'http://10.0.2.2:5001/api/v1', // Use 10.0.2.2 for Android Emulator, 127.0.0.1 for iOS
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  ApiClient() {
    dio.interceptors.add(
      InterceptorsWrapper(
        // 1. Attach Access Token to Requests
        onRequest: (options, handler) async {
          final accessToken = await TokenStorage.getAccessToken();
          if (accessToken != null) {
            options.headers['Authorization'] = 'Bearer $accessToken';
          }
          return handler.next(options);
        },

        // 2. Intercept 401 TOKEN_EXPIRED & Refresh Token
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            final errorCode = error.response?.data['errorCode'];

            if (errorCode == 'TOKEN_EXPIRED') {
              try {
                final refreshToken = await TokenStorage.getRefreshToken();
                if (refreshToken == null) {
                  await _forceLogout();
                  return handler.next(error);
                }

                // Call Refresh Endpoint
                final refreshResponse = await Dio().post(
                  '${dio.options.baseUrl}/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );

                if (refreshResponse.statusCode == 200 && refreshResponse.data['success'] == true) {
                  final newAccessToken = refreshResponse.data['data']['accessToken'];
                  
                  // Save new Access Token
                  await _storage.write(key: 'accessToken', value: newAccessToken);

                  // Update header & retry original request transparently
                  error.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
                  final retryResponse = await dio.fetch(error.requestOptions);
                  return handler.resolve(retryResponse);
                }
              } catch (refreshError) {
                // If refreshing fails (e.g. Refresh Token Expired), force logout
                await _forceLogout();
                return handler.next(error);
              }
            } else if (errorCode == 'REFRESH_TOKEN_EXPIRED' || errorCode == 'INVALID_REFRESH_TOKEN') {
              await _forceLogout();
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  static Future<void> _forceLogout() async {
    await TokenStorage.clear();
    // TODO: Trigger Global Navigation Event to navigate to Login / OTP Screen
  }
}
```

---

## 5. Security & Financial App Recommendations

For Swarnabindu Gold Scheme (Financial/Gold Investment App):

1. **App Inactivity Lock (Recommended):**
   - Monitor `AppLifecycleState` in Flutter.
   - If the app remains in the background for more than 5 minutes, require user PIN / FaceID / Fingerprint verification before granting access to sensitive screens.
2. **Explicit Logout:**
   - Always invoke `POST /api/v1/auth/logout` with the stored `refreshToken` when the user taps "Logout" in settings.

---

## 6. How to Test Session Handling during Flutter Development

1. **Backend Mock Mode:**
   - Server `.env` has `MOCK_MODE=true`. Use any phone number and `MOCK_OTP=123456` to authenticate.
2. **Testing Access Token Expiry:**
   - Access tokens expire after 15 minutes. To test without waiting 15 minutes, temporary modify `expiresIn: '30s'` in `utils/helpers.js` to see the Dio Interceptor refresh automatically after 30 seconds.
3. **Testing Session Expiration:**
   - Call `/api/v1/auth/logout` manually via Postman or erase the MongoDB `RefreshToken` record to verify the Flutter app redirects the user to the OTP login screen on the next API call.
