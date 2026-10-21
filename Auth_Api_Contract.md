# Splitly — Authentication API Contracts

**Base URL:** `/api/v1`


**Response conventions:** successful responses with a body use the repository's `ApiResponse<T>` envelope: `{ "success": true, "message": "...", "data": ... }`. Errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. Endpoints returning `204 No Content` have no response body.

**Endpoints covered:**

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/verify-email/request`
- `POST /auth/verify-email`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

> **Authentication transport:** protected requests use `Authorization: Bearer <accessToken>`. The refresh endpoint uses the HttpOnly `refreshToken` cookie. The backend maintains revocable server-side sessions; logout revokes the current session and clears the refresh-token cookie.

> **User identifier rule:** email is required, and email verification is required before login. Phone is optional, unique when present, and may be used as a login identifier.

---

## POST /api/v1/auth/register

Creates a new Splitly user account.

### Headers

    Content-Type: application/json

### Query Parameters

None.

### Path Parameters

None.

### Request Body

    {  "name": "Shivam Gaikwad",  "email": "shivam@example.com",  "password": "StrongPassword123!",  "phone": "+919876543210"}

### Validation and Normalization

| Field      | Required | Rules                                                                |
| ---------- | -------- | -------------------------------------------------------------------- |
| `name`     | Yes      | String, trimmed, non-empty, maximum 100 characters                   |
| `email`    | Yes      | Valid email, trimmed, converted to lowercase, maximum 254 characters |
| `password` | Yes      | String, minimum 8 characters; password is never trimmed              |
| `phone`    | No       | Valid phone number, normalized to E.164 format                       |

Additional rules:

* Email uniqueness is checked after normalization.

* Phone uniqueness is checked after normalization.

* Phone is optional.

* A missing phone is stored as `NULL`.

* A newly registered account always starts with `emailVerified = false`.


* The password is hashed before being stored.

* No password, password hash, verification code, or verification secret is returned in the response.

### Registration Processing

    Request
    ↓ Validate request body
    ↓ Normalize email
    ↓ Normalize phone if supplied
    ↓ Check email uniqueness
    ↓ Check phone uniqueness
    ↓ Hash password
    ↓ Create unverified user
    ↓ Return created user

Registration does not send a verification email, generate a verification code, or create an authenticated session. It does not return an access token or refresh token. The client may call `POST /api/v1/auth/verify-email/request` when the user chooses to request a verification email.

### Success Response — `201 Created`

Successful responses use the existing `ApiResponse<T>` envelope defined in `src/types/apiResponse.ts`.

```json
{
  "success": true,
  "message": "Account created successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "123",
      "name": "Shivam Gaikwad",
      "email": "shivam@example.com",
      "emailVerified": false,
      "phone": "+919876543210"
    }
  }
}
```

`id` is the PostgreSQL `BIGINT` user ID serialized as a string for JSON compatibility. Do not use a prefixed identifier such as `usr_123` unless the ID scheme is deliberately changed.

When no phone number is supplied, `data.user.phone` is `null`. The response must not include a password, password hash, verification code, or verification secret.

### Error Responses

#### `400 Bad Request`

The request body is syntactically valid JSON but fails validation.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data."
  }
}
```

#### `409 Conflict` — Email

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email already exists."
  }
}
```

#### `409 Conflict` — Phone

```json
{
  "success": false,
  "error": {
    "code": "PHONE_ALREADY_EXISTS",
    "message": "An account with this phone number already exists."
  }
}
```

#### `429 Too Many Requests`

Registration attempts have exceeded the allowed rate limit.

### Security Rules

* Never store the plaintext password.

* Never expose the password hash.

* Never expose the email-verification secret.

* Registration must remain protected by rate limiting.

* PostgreSQL unique constraints remain the final protection against duplicate email or phone values even if an application-level uniqueness check passes.

### Authentication State After Registration

    User created    
    ↓
    emailVerified = false
    ↓
    No auth session    
    ↓
    User must verify email    
    ↓
    User may then log in

---

## 2. POST /auth/login

Authenticates an existing user.

### Headers

```http
Content-Type: application/json
```

### Query Parameters

None.

### Path Parameters

None.

### Request Body

`identifier` accepts either the user's email address or phone number.

```json
{
  "identifier": "shivam@example.com",
  "password": "StrongPassword123!"
}
```

A phone-number login is also valid:

```json
{
  "identifier": "+919876543210",
  "password": "StrongPassword123!"
}
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<access-token>",
    "user": {
      "id": "123",
      "name": "Shivam Gaikwad",
      "email": "shivam@example.com",
      "emailVerified": true,
      "phone": "+919876543210"
    }
  }
}
```

The refresh token is set in an HttpOnly cookie and is not included in the JSON response.

### Error Responses

#### `400 Bad Request`

Malformed or missing input.

#### `401 Unauthorized`

The credentials are invalid.

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid identifier or password."
  }
}
```

Use the same generic message for an unknown email/phone and a wrong password to reduce account-enumeration leakage.

#### `403 Forbidden`

Use this only when the credentials are valid but the account is not currently allowed to authenticate, for example because Splitly requires email verification before login.

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email before logging in."
  }
}
```

#### `429 Too Many Requests`

Too many login attempts.

### Why these status codes?

- **200** because an existing authentication operation completed successfully; no new user resource is being created by the endpoint itself.
- **401** because authentication failed. The server could not establish the requested authenticated identity.
- **403** because the identity may be known, but the requested action is not permitted under the current account state.
- **429** because repeated authentication attempts were rate-limited.

> Do not use `403` for a wrong password. Wrong credentials are an authentication failure (`401`).

---

## 3. POST /auth/refresh

Rotates the refresh token and returns a new access token.

### Headers

```http
Content-Type: application/json
```

### Cookies

The request must include the `refreshToken` HttpOnly cookie set by login or a previous refresh. The refresh token is not sent in the JSON body.

### Query Parameters

None.

### Request Body

None.

### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "data": {
    "accessToken": "<new-access-token>"
  }
}
```

The server replaces the refresh-token cookie with the rotated token. The raw refresh token is not returned in the response body.

### Error Responses

#### `401 Unauthorized`

The refresh token is missing, invalid, expired, revoked, or has already been rotated.

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Invalid refresh token"
  }
}
```

#### `429 Too Many Requests`

Too many refresh attempts.

### Why these status codes?

- **200** because a new access token was issued.
- **401** because the supplied refresh credential cannot establish a valid session.
- **429** limits abuse of the token-refresh endpoint.

---

## 4. POST /auth/logout

Terminates the current authenticated session.

### Headers

```http
Authorization: Bearer <accessToken>
```

### Query Parameters

None.

### Path Parameters

None.

### Request Body

None.

### Success Response — `204 No Content`

No response body.

### Error Responses

#### `401 Unauthorized`

No valid authentication was supplied when the backend requires an authenticated session for logout.

### Why these status codes?

- **204** means the logout operation succeeded and there is intentionally no response body to return.
- **401** is appropriate when logout is defined as an authenticated operation and the request has no valid credentials.

> If you design logout to be fully idempotent—meaning calling it without a valid session is still treated as success—then `204` can be returned even when the client is already logged out. Pick one behavior and document it consistently.

---

## 5. GET /auth/me

Returns the currently authenticated user's account information.

### Headers

```http
Authorization: Bearer <accessToken>
```

### Query Parameters

None.

### Path Parameters

None.

### Request Body

None.

### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "user": {
      "id": "123",
      "name": "Shivam Gaikwad",
      "email": "shivam@example.com",
      "emailVerified": true,
      "phone": "+919876543210"
    }
  }
}
```

When no phone number is saved, `data.user.phone` is `null`.

### Error Responses

#### `401 Unauthorized`

The request does not contain a valid access token.

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required."
  }
}
```

### Why these status codes?

- **200** because the authenticated resource representation was successfully returned.
- **401** because the server cannot authenticate the caller.

> Do not return `403` merely because the user is not logged in. `403` means the server knows who the caller is but that caller is not allowed to perform the operation.

---

## 6. POST /auth/verify-email/request

Requests an email verification code for the specified email address. This endpoint handles both the initial request and subsequent requests for a replacement code; there is no separate resend endpoint.

### Headers

```http
Content-Type: application/json
```

### Query Parameters

None.

### Path Parameters

None.

### Request Body

```json
{
  "email": "shivam@example.com"
}
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "If the account is eligible, a verification email will be sent.",
  "data": null
}
```

### Error Responses

#### `400 Bad Request`

The request body is missing a valid email address or fails validation.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data."
  }
}
```

#### `429 Too Many Requests`

Too many initial or repeat verification-code requests were made within the allowed period.

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many verification requests. Please try again later."
  }
}
```

### Why these status codes?

- **200** because the backend currently returns a successful response after handling the verification-email request.
- **400** because the supplied email is invalid input.
- **429** because verification-code requests should be rate-limited to prevent abuse and email spam.

> Keep the success response generic so the endpoint does not reveal whether the supplied email belongs to a registered account.

---

## 7. POST /auth/verify-email

Verifies a user's email address using the verification code sent to the specified email address.

### Headers

```http
Content-Type: application/json
```

### Query Parameters

| Parameter | Type   | Required | Description                                         |
| --------- | ------ | -------- | --------------------------------------------------- |
| `email`   | string | Yes      | Email address associated with the verification code |

### Path Parameters

None.

### Request Body

```json
{
  "code": "483921"
}
```

### Example Request

```http
POST /api/v1/auth/verify-email?email=shivam%40example.com
Content-Type: application/json
```

```json
{
  "code": "483921"
}
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": null
}
```

### Error Responses

#### `400 Bad Request`

The verification code is malformed, invalid, expired, or missing.

```json
{
  "success": false,
  "error": {
    "code": "INVALID_VERIFICATION_CODE",
    "message": "The verification code is invalid or has expired."
  }
}
```

#### `409 Conflict`

The email is already verified.

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_VERIFIED",
    "message": "Email is already verified."
  }
}
```

#### `429 Too Many Requests`

Too many verification attempts were made.

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many verification attempts. Please try again later."
  }
}
```

### Why these status codes?

- **200** because the existing user's verification state was successfully updated.
- **400** because the submitted verification code is invalid input for this operation.
- **409** because the requested state change conflicts with the current state when the email is already verified.
- **429** because repeated verification attempts should be rate-limited.

---

## 8. POST /auth/forgot-password

Starts the password-reset flow.

### Headers

```http
Content-Type: application/json
```

### Query Parameters

None.

### Path Parameters

None.

### Request Body

```json
{
  "email": "shivam@example.com"
}
```

### Success Response — `202 Accepted`

```json
{
  "success": true,
  "message": "If an account exists for this email, password-reset instructions will be sent.",
  "data": null
}
```

### Error Responses

#### `400 Bad Request`

Malformed email input.

#### `429 Too Many Requests`

Too many password-reset requests.

### Why these status codes?

- **202** because the API accepts the request and the email delivery can happen asynchronously.
- **400** indicates invalid request data.
- **429** limits abuse of the password-reset mechanism.

> Do not normally return `404` for an unknown email here. A `404` would allow someone to test which email addresses are registered.

---

## 9. POST /auth/reset-password

Changes the user's password using the email-associated password-reset code.

### Headers

```http
Content-Type: application/json
```

### Query Parameters

| Parameter | Type   | Required | Description                                      |
| --------- | ------ | -------- | ------------------------------------------------ |
| `email`   | string | Yes      | Email address associated with the reset code     |

### Path Parameters

None.

### Request Body

```json
{
  "code": "483921",
  "newPassword": "NewStrongPassword123!"
}
```

### Example Request

```http
POST /api/v1/auth/reset-password?email=shivam%40example.com
Content-Type: application/json
```

```json
{
  "code": "483921",
  "newPassword": "NewStrongPassword123!"
}
```

### Success Response — `204 No Content`

No response body.

### Error Responses

#### `400 Bad Request`

The email is invalid, the reset code is invalid or expired, or the new password fails validation.

For an invalid or expired reset code, the backend returns:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "Invalid or expired reset code."
  }
}
```

Invalid email or password input is handled by the corresponding validation/error middleware.

#### `429 Too Many Requests`

Too many reset attempts.

### Why these status codes?

- **204** because the password was changed successfully and the backend returns no response body.
- **400** is appropriate for invalid email/code input or invalid password data.
- **429** protects the endpoint from repeated token-guessing or abuse.

---

# Common Error Status Codes for Authentication

| Status                  | Meaning                                        | Typical Splitly use                              |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `200 OK`                | Request succeeded                              | Login, `/me`, email-verification request and verification |
| `201 Created`           | New resource created                           | Registration                                     |
| `202 Accepted`          | Request accepted for processing                | Forgot password                                   |
| `204 No Content`        | Success with no response body                  | Logout, reset password                           |
| `400 Bad Request`       | Request/input is invalid                       | Validation, invalid/expired codes                |
| `401 Unauthorized`      | Authentication failed or is missing            | Login credentials, protected endpoints           |
| `403 Forbidden`         | Authenticated/recognized caller is not allowed | Unverified account when login is otherwise valid |
| `409 Conflict`          | Request conflicts with current resource state  | Duplicate email, already-verified state          |
| `429 Too Many Requests` | Rate limit exceeded                            | Login, verification, reset flows                 |

---

# Important distinction: 401 vs 403

This is one of the most important status-code rules for your API.

### `401 Unauthorized`

Use when authentication has failed or has not been provided.

Examples:

```text
Wrong password
Missing access token
Expired access token
Invalid access token
```

### `403 Forbidden`

Use when the server knows the caller (or the credential is otherwise valid), but the caller is not permitted to perform the operation.

Example:

```text
Credentials are valid, but the account must verify its email before login is allowed.
```

For protected Splitly resources later, this distinction will become important for authorization too:

```text
401 -> Who are you?
403 -> I know who you are, but you cannot do this.
```

---

# Recommended API Error Shape

Keep authentication errors structurally consistent with the centralized error middleware:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password."
  }
}
```

If field-level validation details are added to `AppError` and `error.middleware.ts`, document and return them consistently in this same error envelope rather than introducing a separate response format.

---

# Contract rules to keep consistent across Splitly

1. Use plural resource names: `/contacts`, `/groups`, `/expenses`.
2. Use path parameters only for resource identity: `/:groupId`, `/:expenseId`.
3. Use request bodies for credentials, verification codes, and mutable data; use query parameters for non-secret identifiers such as email when the contract specifies them.
4. Do not put passwords, verification codes, or password-reset secrets in query parameters.
5. Do not expose whether an email exists during password reset or email-verification request flows.
6. Add `429` handling to authentication endpoints because these endpoints are abuse-sensitive.
7. Do not return passwords, password hashes, verification codes, or reset tokens in API responses.
8. Keep the error response shape consistent across all modules, not just authentication.
