# Splitly — Authentication API Contracts

**Base URL:** `/api/v1`

**Endpoints covered:**

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/verify-email/request`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

> **Authentication assumption for this first contract:** protected requests use `Authorization: Bearer <accessToken>`. The backend should maintain a revocable session/refresh-token record if `/logout` is expected to invalidate the session server-side. If Splitly later uses HttpOnly cookies instead, the request/response transport changes, but the endpoint semantics and most status codes remain the same.

> **User identifier rule:** email is required and verified; phone is optional, unique when present, not verified by the current auth flow, and may still be used as a login identifier. A phone number can be changed later through the user profile flow. `phoneVerified` should remain `false` until a future phone-verification flow exists.

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

* Phone numbers are not verified by registration.

* A newly registered account always starts with `emailVerified = false`.

* `phoneVerified` is always `false` until a future phone-verification flow exists.

* The password is hashed before being stored.

* No password, password hash, verification code, or verification secret is returned in the response.

### Registration Processing

    Request  ↓Validate request body  ↓Normalize email  ↓Normalize phone if supplied  ↓Check email uniqueness  ↓Check phone uniqueness  ↓Hash password  ↓Create unverified user  ↓Initialize email-verification flow  ↓Return created user

Registration does not create an authenticated session and does not return an access token or refresh token.

### Success Response — 201 Created

    {  
    "message": "Account created successfully. Please verify your email.",  
    "user": {    
        "id": "123",    
        "name": "Shivam Gaikwad",    
        "email": "shivam@example.com",    
        "emailVerified": false,    
        "phone": "+919876543210",    
        "phoneVerified": false  
    }}

`id` is the PostgreSQL `BIGINT` user ID serialized as a string for JSON compatibility.

When no phone number is supplied:
    {  "message": "Account created successfully. Please verify your email.",  "user": {    "id": "123",    "name": "Shivam Gaikwad",    "email": "shivam@example.com",    "emailVerified": false,    "phone": null,    "phoneVerified": false  }}

### Error Responses

#### 400 Bad Request

The request body is syntactically valid JSON but fails validation.
    {  "error": {    "code": "VALIDATION_ERROR",    "message": "Invalid request data.",    "fields": {      "email": "Invalid email address.",      "password": "Password must contain at least 8 characters."    }  }}

#### 409 Conflict — Email

    {  "error": {    "code": "EMAIL_ALREADY_EXISTS",    "message": "An account with this email already exists."  }}

#### 409 Conflict — Phone

    {  "error": {    "code": "PHONE_ALREADY_EXISTS",    "message": "An account with this phone number already exists."  }}

#### 429 Too Many Requests

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
    phoneVerified = false    
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
  "message": "Login successful.",
  "user": {
    "id": "usr_123",
    "name": "Shivam Gaikwad",
    "email": "shivam@example.com",
    "emailVerified": true,
    "phone": "+919876543210",
    "phoneVerified": false
  },
  "accessToken": "<access-token>"
}
```

### Error Responses

#### `400 Bad Request`

Malformed or missing input.

#### `401 Unauthorized`

The credentials are invalid.

```json
{
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

## 3. POST /auth/logout

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

## 4. GET /auth/me

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
  "user": {
    "id": "usr_123",
    "name": "Shivam Gaikwad",
    "email": "shivam@example.com",
    "emailVerified": true,
    "phone": "+919876543210",
    "phoneVerified": false
  }
}
```

### Error Responses

#### `401 Unauthorized`

The request does not contain a valid access token.

```json
{
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

## 5. POST /auth/verify-email/request

Requests an email verification code for the specified email address.

### Headers

```http
Content-Type: application/json
```

### Query Parameters

| Parameter | Type   | Required | Description                                             |
| --------- | ------ | -------- | ------------------------------------------------------- |
| `email`   | string | Yes      | Email address that should receive the verification code |

### Path Parameters

None.

### Request Body

None.

### Example Request

```http
POST /api/v1/auth/verify-email/request?email=shivam%40example.com
```

### Success Response — `202 Accepted`

```json
{
  "message": "If the email is eligible for verification, a verification code has been sent."
}
```

### Error Responses

#### `400 Bad Request`

The email parameter is missing or invalid.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A valid email address is required."
  }
}
```

#### `429 Too Many Requests`

Too many verification-code requests were made within the allowed period.

```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many verification requests. Please try again later."
  }
}
```

### Why these status codes?

- **202** because the server has accepted the request and may send the verification email asynchronously.
- **400** because the supplied email is invalid input.
- **429** because verification-code requests should be rate-limited to prevent abuse and email spam.

> Keep the success response generic so the endpoint does not reveal whether the supplied email belongs to a registered account.

---

## 6. POST /auth/verify-email

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
  "message": "Email verified successfully."
}
```

### Error Responses

#### `400 Bad Request`

The verification code is malformed, invalid, expired, or missing.

```json
{
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

## 7. POST /auth/resend-verification

Requests a new email verification code for the specified email address.

### Headers

```http
Content-Type: application/json
```

### Query Parameters

| Parameter | Type   | Required | Description                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `email`   | string | Yes      | Email address that should receive the new verification code |

### Path Parameters

None.

### Request Body

None.

### Example Request

```http
POST /api/v1/auth/resend-verification?email=shivam%40example.com
```

### Success Response — `202 Accepted`

```json
{
  "message": "If the email is eligible for verification, a new verification code has been sent."
}
```

### Error Responses

#### `400 Bad Request`

The email parameter is missing or invalid.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A valid email address is required."
  }
}
```

#### `429 Too Many Requests`

The resend limit has been exceeded.

```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Please wait before requesting another verification code."
  }
}
```

### Why these status codes?

- **202** because the request has been accepted and email delivery may happen asynchronously.
- **400** because the supplied email is invalid input.
- **429** because repeated resend requests should be rate-limited to prevent abuse and email spam.

> Keep the success response generic rather than revealing whether an account exists for the supplied email.

---

## 7. POST /auth/forgot-password

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
  "message": "If an account exists for this email, password-reset instructions will be sent."
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

## 8. POST /auth/reset-password

Changes the user's password using a valid reset token/code.

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
  "token": "<password-reset-token>",
  "newPassword": "NewStrongPassword123!"
}
```

### Success Response — `204 No Content`

No response body.

### Error Responses

#### `400 Bad Request`

The token is invalid/expired or the password fails validation.

```json
{
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "The reset token is invalid or has expired."
  }
}
```

#### `429 Too Many Requests`

Too many reset attempts.

### Why these status codes?

- **204** because the password was changed successfully and there is no need to return a representation of the updated password.
- **400** is appropriate for an invalid/expired reset token or invalid password input.
- **429** protects the endpoint from repeated token-guessing or abuse.

---

# Common Error Status Codes for Authentication

| Status                  | Meaning                                        | Typical Splitly use                              |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `200 OK`                | Request succeeded                              | Login, `/me`, email verification                 |
| `201 Created`           | New resource created                           | Registration                                     |
| `202 Accepted`          | Request accepted for processing                | Resend verification, forgot password             |
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

Keep authentication errors structurally consistent:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password.",
    "fields": {}
  }
}
```

For field validation, `fields` can contain field-specific messages. For non-validation errors, omit `fields` or return an empty object—just keep the convention consistent across the API.

---

# Contract rules to keep consistent across Splitly

1. Use plural resource names: `/contacts`, `/groups`, `/expenses`.
2. Use path parameters only for resource identity: `/:groupId`, `/:expenseId`.
3. Use request bodies for credentials, verification codes, and mutable data; use query parameters for non-secret identifiers such as email when the contract specifies them.
4. Do not put passwords, verification codes, or password-reset secrets in query parameters.
5. Do not expose whether an email exists during password reset or resend-verification flows.
6. Add `429` handling to authentication endpoints because these endpoints are abuse-sensitive.
7. Do not return passwords, password hashes, verification codes, or reset tokens in API responses.
8. Keep the error response shape consistent across all modules, not just authentication.
