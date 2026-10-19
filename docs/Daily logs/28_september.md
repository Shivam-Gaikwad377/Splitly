# Splitly Project Log — 28 September 2026

## Agenda

Authentication implementation — Login flow.

Today's focus was to move from the authentication foundation completed on 27 September into the actual **Login** flow, while designing the system layer-by-layer rather than jumping directly into implementation.

---

## 1. Phase 0 — Authentication Foundation Review

Before implementing Login, the existing project structure and authentication components were reviewed.

Yesterday's completed work included:

- `auth_sessions` table
- JWT access-token utilities
- refresh-token generation and hashing
- `AuthenticatedUser`
- `req.user`
- authentication middleware

The existing architecture uses:

```text
Short-lived JWT access token
+
Long-lived opaque refresh token
+
Server-side auth session
```

The JWT contains:

```text
sub → user ID
sid → session ID
iat
exp
```

The access token lifetime is 15 minutes.

The `auth_sessions` table was confirmed as:

```text
id
user_id
token_hash
expires_at
revoked_at
created_at
```

`revoked_at = NULL` represents an active session.

---

## 2. Users Table Review

The actual `users` table structure was reviewed.

Relevant authentication columns were identified as:

```text
id
name
phone
email
password_hash
email_isverified
```

The email-verification-specific fields were also identified:

```text
email_verification_token_hash
email_verification_token_expiresat
pending_email
```

These fields belong to the email-verification flow and are not required for the normal Login flow.

An existing design decision was reaffirmed:

```text
email → NOT NULL
phone → nullable
phone → stored in international format
```

---

## 3. Login Flow Designed

The Login flow was broken down into:

```text
Login request
    ↓
Validate identifier
    ↓
Normalize identifier
    ↓
Find user
    ↓
Verify password
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
Set refresh cookie
    ↓
Return access token + user
```

### Identifier

Login accepts a single:

```text
identifier
```

which can represent either an email or a phone number.

### Validation

Obviously invalid identifiers should be rejected before unnecessarily querying PostgreSQL.

### Normalization

Normalization was assigned to the **service layer**.

### Credentials

A missing user and a wrong password should ultimately produce the same authentication failure:

```text
401 Unauthorized
Invalid credentials
```

---

## 4. Repository Layer Introduced

The project initially had no repository layer.

A repository layer was intentionally introduced to separate PostgreSQL operations from authentication/business logic.

New structure:

```text
modules/auth/
├── auth.controller.ts
├── auth.middleware.ts
├── auth.routes.ts
├── auth.services.ts
└── auth.repository.ts
```

The responsibility split is:

```text
Controller
    ↓
HTTP handling

Service
    ↓
Authentication/business logic

Repository
    ↓
PostgreSQL operations
```

---

## 5. `findUserByIdentifier()` Implemented

Created:

```text
auth.repository.ts
```

The repository performs the user lookup using a parameterized PostgreSQL query.

The chosen lookup strategy is:

```sql
WHERE email = $1
   OR phone = $1
LIMIT 1
```

The function signature is:

```ts
findUserByIdentifier(identifier: string)
```

The repository returns:

```text
User object
```

when a match exists, or:

```text
null
```

when no user exists.

The query was changed from `SELECT *` to explicitly selecting only the fields needed for authentication/login.

The repository does not handle:

```text
password verification
email verification decisions
JWT generation
cookies
HTTP 401 responses
```

---

## 6. Password Verification Implemented

`bcryptjs` was selected for password verification.

The authentication model was clarified as:

```text
plain password
        +
stored password_hash
        ↓
bcrypt.compare()
        ↓
true / false
```

A separate password utility was considered but deliberately not introduced because it would add abstraction without an immediate benefit for the current learning stage.

The password comparison remains directly in the authentication service.

A correction was identified during implementation:

```text
bcrypt.compareSync()
```

should be replaced with:

```text
await bcrypt.compare()
```

to avoid synchronously blocking Node.js while the password comparison runs.

---

## 7. Login Service Started

`auth.services.ts` now contains the beginning of:

```ts
login(identifier: string, password: string)
```

The implemented flow currently reaches:

```text
Find user
    ↓
Reject invalid credentials if user missing
    ↓
Verify password
    ↓
Reject invalid credentials if password fails
    ↓
Check email verification
    ↓
Reject if email is not verified
    ↓
Generate refresh token
    ↓
Hash refresh token
    ↓
Create auth session
    ↓
Generate access token
```

The Login implementation is **not yet complete**.

---

## 8. Auth Session Creation Implemented

Created repository operation:

```text
createAuthSession()
```

It currently accepts:

```text
userId
refreshTokenHash
```

and generates a 30-day session expiry.

The database insertion uses:

```text
user_id
token_hash
expires_at
```

while PostgreSQL supplies defaults for:

```text
revoked_at → NULL
created_at → NOW()
```

The repository returns the newly generated:

```text
session.id
```

because the session ID is required for the access-token `sid` claim.

The dependency is:

```text
refresh token
      ↓
hash
      ↓
create session
      ↓
session.id
      ↓
generate access token
```

---

## 9. Important Technical Understanding Gained

### User lookup vs password verification

```text
Identifier
    ↓
Which user is this?

Password
    ↓
Does this password match that user's password_hash?
```

### Repository vs service

Repository:

```text
talks to PostgreSQL
```

Service:

```text
makes authentication/business decisions
```

### `LIMIT 1`

```text
WHERE
    ↓
find matching rows
    ↓
LIMIT 1
    ↓
return at most one
```

`LIMIT 1` does not enforce uniqueness. Database constraints are responsible for that.

### `NULL`

A missing optional phone number represented as `NULL` does not mean the user doesn't exist.

User existence is determined by whether the query returned a row.

---

## 10. Database Configuration

The existing PostgreSQL connection uses `pg.Pool` in:

```text
src/config/database.ts
```

The pool configuration currently includes:

```text
max: 10
idleTimeoutMillis: 30_000
connectionTimeoutMillis: 5_000
```

No new database connection mechanism was introduced.

---

## 11. Trade-offs Discussed

### One lookup query vs separate email/phone queries

Chosen:

```sql
WHERE email = $1 OR phone = $1
```

because it keeps the repository interface simple:

```ts
findUserByIdentifier(identifier: string)
```

The trade-off is that the repository is less explicit about identifier type.

### Repository layer vs SQL directly in service

Repository layer was chosen because Splitly is expected to grow and the project is being designed deliberately.

### Dedicated password utility vs direct bcrypt usage

A separate `comparePassword()` utility was intentionally not added yet to avoid unnecessary abstraction.

### Hardcoded 30-day expiry

A 30-day refresh session was used for now.

It was recognized that this should eventually move into configuration rather than being hardcoded.

---

## 12. Problems / Corrections

Several mistakes were caught during implementation:

```text
❌ refresh_token_hash used in RETURNING
✅ actual column is token_hash

❌ bcrypt.compareSync()
✅ bcrypt.compare()

❌ treating accessToken + user as repository output
✅ repository returns database user/session data

❌ treating 401 as repository responsibility
✅ authentication/service layer determines failure,
   HTTP layer eventually produces 401
```

---

## 13. Current Status

```text
Phase 1 — Auth sessions                  ✅ Complete
Phase 2 — JWT + refresh utilities        ✅ Complete
Phase 3 — Authenticated user typing      ✅ Complete
Phase 4 — Auth middleware                ✅ Complete

Phase 5 — Login                          🟡 In progress
    User lookup                           ✅
    Password verification                 ✅
    Email verification check              ✅
    Refresh token generation              ✅
    Refresh token hashing                 ✅
    Auth session creation                 ✅
    Access token generation               🟡
    Set refresh cookie                     ⬜
    Return access token + user              ⬜
```

---

## 14. Next Session

Continue Login from the current point:

```text
createAuthSession()
        ↓
session.id
        ↓
signAccessToken(userId, sessionId)
        ↓
set HttpOnly refresh cookie
        ↓
return access token + safe user object
```

After Login is completed and tested:

```text
Refresh
    ↓
read cookie
    ↓
hash token
    ↓
find session
    ↓
check revoked_at
    ↓
check expires_at
    ↓
rotate token
    ↓
new access token
    ↓
replace cookie
```

Then:

```text
Logout
    ↓
authenticate request
    ↓
read sessionId from req.user
    ↓
revoke session
    ↓
clear cookie
    ↓
204
```

---

## Today's Main Milestone

Splitly moved from having an authentication **foundation** to having an actual **Login implementation taking shape**, including the first repository layer and database-backed session creation.

The Login flow is not yet finished. The next session should begin from the access-token step rather than restarting the authentication design.
