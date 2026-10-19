# Splitly Project Log — 30 September 2026

## Agenda

Complete and verify the **Login flow** end-to-end, then prepare the project for the next authentication feature: **Refresh token rotation**.

Today's work moved Login from implementation into actual API testing with Postman.

---

## 1. Login Flow — Completed ✅

The Login flow is now working end-to-end.

Final flow:

```text
POST /auth/login
        ↓
Find user
        ↓
Verify password with bcrypt
        ↓
Check email verification
        ↓
Generate refresh token
        ↓
Hash refresh token
        ↓
Create auth session
        ↓
Generate access token
        ↓
Set refresh token as HttpOnly cookie
        ↓
Return access token + safe user object
```

---

## 2. Repository Layer

A repository layer was introduced for the authentication module.

Current structure:

```text
src/modules/auth/
├── auth.controller.ts
├── auth.middleware.ts
├── auth.routes.ts
├── auth.services.ts
└── auth.repository.ts
```

The responsibility split is:

```text
Controller
→ HTTP request/response

Service
→ authentication/business logic

Repository
→ PostgreSQL operations
```

This was deliberately chosen instead of putting raw SQL directly into the service.

---

## 3. User Lookup

Implemented:

```ts
findUserByIdentifier(identifier: string)
```

The repository uses raw PostgreSQL with a parameterized query:

```sql
SELECT
    id,
    name,
    email,
    phone,
    password_hash,
    email_isverified
FROM users
WHERE email = $1
   OR phone = $1
LIMIT 1;
```

The function returns:

```text
User → when a matching row exists
null → when no user exists
```

No ORM is being used.

---

## 4. Password Verification

`bcryptjs` is used for password verification.

The authentication model is:

```text
plain password
        +
stored password_hash
        ↓
await bcrypt.compare()
        ↓
true / false
```

Important correction made during development:

```text
bcrypt.compareSync()
        ↓
await bcrypt.compare()
```

The async version is preferred for the Express server so the password comparison does not synchronously block Node.js.

---

## 5. Email Verification

After successful password verification, the service checks:

```text
user.email_isverified
```

The intended behavior is:

```text
password incorrect
→ 401 Invalid credentials

user not found
→ 401 Invalid credentials

password correct but email unverified
→ 403 Email not verified
```

Unknown users and incorrect passwords intentionally use the same external authentication failure.

---

## 6. Refresh Token + Auth Session

The Login service now performs:

```text
generateRefreshToken()
        ↓
hashRefreshToken()
        ↓
createAuthSession()
```

The raw refresh token is never stored in PostgreSQL.

The database receives only:

```text
token_hash
```

The `auth_sessions` table contains:

```text
id
user_id
token_hash
expires_at
revoked_at
created_at
```

Session defaults were configured so:

```text
revoked_at → NULL
created_at → NOW()
```

A login session currently expires after **30 days**.

The repository creates the session and returns the generated session ID.

---

## 7. Access Token

After session creation:

```text
session.id
        +
user.id
        ↓
signAccessToken()
```

The existing Splitly JWT design is:

```text
sub → user ID
sid → session ID
iat
exp
```

The access token lifetime is currently 15 minutes.

---

## 8. Login Response + Refresh Cookie

The controller sets the raw refresh token in an HttpOnly cookie.

Current cookie configuration:

```text
httpOnly: true
secure: process.env.NODE_ENV === "production"
sameSite: "strict"
maxAge: 30 days
```

The response body contains:

```text
accessToken
user
```

The refresh token is intentionally NOT included in the JSON response.

The important separation is:

```text
JSON response
→ access token + safe user data

HttpOnly cookie
→ raw refresh token

PostgreSQL
→ refresh token hash
```

---

## 9. Error Handling Architecture

Splitly has a centralized error-handling system:

```text
src/utils/app-error.ts
src/middleware/error.middleware.ts
```

`AppError` contains:

```text
message
statusCode
code
isOperational
```

`errorMiddleware`:

- formats `AppError` responses
- returns a generic 500 for unexpected errors

The project is using Express 5, so async route-handler promise rejections can be forwarded to the error middleware without an `asyncHandler` wrapper.

### Important cleanup / verification

The preferred controller pattern is:

```text
Service
→ throw AppError
→ Express 5
→ errorMiddleware
```

rather than repetitive controller-level `try/catch` logic. This should be verified against the current code before the next production-hardening pass.

---

## 10. Login Routes

The authentication route was added.

Current route structure:

```text
src/routes/index.ts
        ↓
/auth
        ↓
src/modules/auth/auth.routes.ts
        ↓
POST /login
```

Final API endpoint:

```text
POST /auth/login
```

`authMiddleware` is NOT applied to Login because authentication has not happened yet.

---

## 11. Test User Seed

Because Splitly does not yet have a user-registration endpoint, a small development seed was created to provide a real user for authentication testing.

The seed:

```text
- generates a bcrypt password hash
- inserts a test user
- marks the email as verified
- lets PostgreSQL generate the user ID
```

The `users.id` column was changed to PostgreSQL IDENTITY so IDs are generated automatically.

This allowed Login to be tested without building registration first.

---

## 12. Postman Setup and Testing

A local Postman environment was configured for testing the backend.

Login request:

```text
POST {{baseUrl}}/auth/login
```

The Login request was successfully tested.

Verified:

```text
✅ 200 response
✅ access token returned
✅ user object returned
✅ refresh token appears in Set-Cookie
✅ refresh token is not returned in JSON
✅ auth_sessions row is created
✅ token_hash is stored in PostgreSQL
✅ revoked_at starts as NULL
✅ session expiry is populated
```

This confirms that Login is communicating correctly across:

```text
Postman
→ Express
→ Auth Service
→ Auth Repository
→ PostgreSQL
```

---

## 13. Architecture Learned Today

Current authentication architecture:

```text
Client
   ↓
Auth Controller
   ↓
Auth Service
   ↓
Auth Repository
   ↓
PostgreSQL
```

Authentication model:

```text
Short-lived JWT access token
+
Long-lived opaque refresh token
+
Server-side revocable auth session
```

---

## 14. Trade-offs and Design Decisions

### Raw PostgreSQL vs ORM

Splitly continues to use raw PostgreSQL so the database layer remains visible and understandable as a learning project.

### Repository layer

A repository was introduced once the auth module began containing multiple database operations.

### Password utility abstraction

A separate `comparePassword()` utility was intentionally NOT added. Direct `bcryptjs` usage in the auth service is sufficient for the current scope.

### Cookie vs JSON refresh token

The raw refresh token is kept in an HttpOnly cookie instead of being exposed to frontend JavaScript.

### Database as session authority

The browser cookie has its own expiry, but the server decides whether a refresh session is valid using:

```text
auth_sessions.revoked_at
auth_sessions.expires_at
```

---

## 15. Current Authentication Status

```text
Foundation
✅ Auth sessions table
✅ JWT utilities
✅ Refresh token utilities
✅ AuthenticatedUser
✅ Auth middleware

Login
✅ User lookup
✅ Password verification
✅ Email verification check
✅ Refresh token generation
✅ Refresh token hashing
✅ Auth session creation
✅ Access token generation
✅ HttpOnly refresh cookie
✅ Login route
✅ Postman integration test
✅ Database verification

Refresh
⬜ Read refresh cookie
⬜ Hash token
⬜ Find session
⬜ Check revoked_at
⬜ Check expires_at
⬜ Rotate refresh token
⬜ Generate new access token
⬜ Replace cookie

Logout
⬜ Authenticate request
⬜ Read session ID from req.user
⬜ Revoke session
⬜ Clear refresh cookie
⬜ Return 204

Hardening
⬜ Rate limiting
⬜ More complete automated auth tests
⬜ Fully verify AppError usage across auth controllers/services
```

---

# 16. What To Do Next

The next feature is **Refresh**.

Do not start by writing the whole endpoint. Build it incrementally.

### Step 1 — Read the cookie

The request will contain:

```text
Cookie
└── refreshToken=<raw token>
```

First determine how Express currently exposes cookies to the controller. Check whether the project already has cookie parsing configured before adding another dependency.

### Step 2 — Hash the raw token

Once the raw token is available:

```text
raw refresh token
        ↓
hashRefreshToken()
        ↓
token_hash
```

### Step 3 — Find the session

Add a repository function to search:

```text
auth_sessions.token_hash
```

and return the session data the service needs.

### Step 4 — Validate the session

The service should verify:

```text
session exists
session.revoked_at IS NULL
session.expires_at > current time
```

### Step 5 — Rotate the refresh token

The old refresh token must become unusable after a successful refresh:

```text
old refresh token
        ↓
validated
        ↓
new refresh token generated
        ↓
new hash replaces old hash
```

This should eventually be handled atomically so concurrent refresh requests cannot both succeed with the same old token.

### Step 6 — Generate a new access token

Use the existing:

```text
user_id
+
session_id
```

to create a new short-lived JWT.

### Step 7 — Replace the cookie

Send the new raw refresh token as the same HttpOnly cookie.

### Step 8 — Test token reuse

This test is critical:

```text
Refresh token A
        ↓
refresh succeeds
        ↓
token B issued

Try token A again
        ↓
must fail
```

That proves refresh-token rotation is actually working.

---

## 17. Important Context for the Next Session

Start the next session from this exact point:

```text
LOGIN ✅
        ↓
REFRESH ⬅ START HERE
        ↓
read refreshToken cookie
```

Relevant files:

```text
src/config/database.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.routes.ts
src/modules/auth/auth.services.ts
src/modules/auth/auth.repository.ts
src/modules/auth/auth.middleware.ts
src/middleware/error.middleware.ts
src/utils/app-error.ts
src/utils/auth/jwt.ts
src/utils/auth/refreshToken.ts
```

Relevant database tables:

```text
users
auth_sessions
```

Current authentication design:

```text
Access token lifetime → 15 minutes
Refresh/session lifetime → 30 days
JWT algorithm → HS256
Access token claims → sub, sid, iat, exp
Refresh token → opaque random token
Stored refresh credential → SHA-256 hash
Session revocation → revoked_at
Session expiry → expires_at
Phone storage → international format
```

Do not redesign these decisions unless a concrete implementation problem appears.

---

## Today's Main Milestone

**Splitly Login is now working end-to-end and has been verified through Postman and PostgreSQL.**

The project has moved from authentication design into a functioning authentication lifecycle.

The next session should begin with **Refresh token handling**, starting with reading the refresh cookie.
