# Splitly Backend — Registration Feature Project Log

**Project:** Splitly — Splitwise-inspired expense-sharing application  
**Area:** Backend / Authentication  
**Stack:** TypeScript, Express 5, PostgreSQL, Vitest, Supertest, Zod, bcryptjs  
**Branch:** `feature/auth`  
**Log date:** 9 October 2026  
**Status:** Registration implementation complete; unit and integration tests passing

---

## 1. Objective

Implement the registration endpoint for Splitly in a way that fits the existing authentication architecture and API conventions. The feature needed to validate incoming registration data, prevent duplicate accounts, hash passwords before persistence, handle database uniqueness races, return a safe public user representation, and be covered by unit and integration tests.

## 2. Registration contract and decisions

The registration feature follows these decisions:

- Registration returns **`201 Created`** on success.
- The success response uses Splitly's existing `ApiResponse<T>` envelope:

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

- `phone` is optional. When omitted, it is stored and returned as `null`.
- Phone numbers are normalized to E.164 when supplied and must be unique.
- **Splitly does not have phone verification.** No `phoneVerified` response field, database column, verification token, or phone-verification endpoint is part of this feature.
- A newly registered account starts with `email_isverified = false`.
- PostgreSQL `BIGINT` user IDs are serialized as strings in JSON.
- Passwords are hashed before storage. The password and password hash must never be returned.
- Registration does not create an authentication session and does not return access or refresh tokens.
- An existing email is treated as a duplicate even when the account has not verified its email. Registration must not replace the existing account's password.
- Existing database unique constraints remain the final protection against concurrent duplicate inserts.

**Route detail:** The application and existing integration tests use `/auth/...` paths because `src/app.ts` mounts the central router without an `/api/v1` prefix and `src/routes/index.ts` mounts auth routes at `/auth`. The API contract document has `/api/v1` as its stated base URL; aligning the application and contract is a separate follow-up decision. The tests were kept consistent with the currently running application.

## 3. Work completed

### 3.1 Request validation

- Added a registration Zod schema in the auth validation module.
- Registration validation covers required name, email and password, plus optional phone.
- Name is trimmed and must be non-empty, with a maximum length of 100 characters.
- Email is trimmed, normalized to lowercase, validated, and limited to 254 characters.
- Password has a minimum length of 8 characters and is not trimmed.
- A supplied phone number is validated and normalized to E.164.
- Phone can be omitted.
- Used a reusable `validateBody(schema)` middleware so request validation can be applied at route registration rather than duplicated in each controller.
- Kept cookie validation for refresh tokens separate from body validation.

### 3.2 Repository layer

Implemented repository operations for:

- `findUserByEmail(email)`
- `findUserByPhone(phone)`
- `createUser(name, email, phone, passwordHash)`

The SQL uses parameterized values. Duplicate-check queries only need to retrieve the user's ID rather than every column. The insert returns the fields needed to construct the registration response, while avoiding returning the password hash.

The existing schema includes unique constraints named `users_email_key` and `users_phone_key`. The phone column is nullable, so users can register without a phone number.

### 3.3 Service layer

Implemented `registerService()` to:

1. Check whether the normalized email already exists.
2. Check whether a supplied phone number already exists.
3. Hash the password with `bcrypt.hash(password, 10)`.
4. Create the user through the repository.
5. Return the created user data.

Duplicate email and phone cases are represented as `AppError` conflicts using the contract error codes `EMAIL_ALREADY_EXISTS` and `PHONE_ALREADY_EXISTS`.

The service also handles PostgreSQL unique-constraint violations (`23505`) that can occur if concurrent requests pass the initial duplicate checks. It maps the recognized constraint name to the appropriate conflict and rethrows unexpected errors so the centralized error middleware can handle them.

### 3.4 Controller and response envelope

Added `registerController()` to:

- Read the validated fields from `req.body`.
- Call `registerService()`.
- Construct a public response object rather than returning the database row directly.
- Return HTTP `201` with the existing `ApiResponse<T>` envelope.

The controller maps database field `email_isverified` to public API field `emailVerified`. This is intentional: database naming and API naming are separate contracts.

The response contains `id`, `name`, `email`, `emailVerified`, and `phone`. It does not include password fields or phone-verification fields.

Express 5 forwards rejected promises from async route handlers to the error middleware. The controller does not need a catch block just to forward errors; a service-level `try/catch` is used only when translating known PostgreSQL constraint violations.

### 3.5 Routes

- Added the registration endpoint to the existing auth router.
- Applied `validateBody(registerSchema)` before `registerController`.
- Preserved the existing login, refresh, and logout routes.
- Confirmed that the current application route is `/auth/register` under the existing router mounts.

### 3.6 Unit tests

Added registration schema tests and registration service tests. The service tests mock repository functions and the password-hashing dependency, so they run without a real PostgreSQL connection.

Coverage includes:

- Valid registration data.
- Email normalization and name trimming.
- Invalid email, missing name, and too-short password.
- Optional phone and phone validation/normalization.
- Password is not trimmed.
- Duplicate email and duplicate phone.
- Successful user creation with a password hash.
- PostgreSQL `23505` mapping for email and phone constraints.
- Unexpected database errors are rethrown.

All unit tests passed after correcting the bcrypt mock's TypeScript return type to `Promise<string>`.

### 3.7 Integration tests

Added `tests/integration/auth/register.test.ts` using Supertest, the Express app, and the test PostgreSQL database.

Coverage includes:

- Successful registration.
- Invalid request body.
- Duplicate email, including an unverified existing account.
- Duplicate phone.
- Registration without a phone number.
- Password is stored as a bcrypt hash.
- New account starts with `email_isverified = false`.
- Registration does not create an authentication session.
- Response omits password/hash and `phoneVerified`.

The test initially failed because the controller returned `email_isverified` and an older success message. The controller was corrected to map the database column to `emailVerified` and to use the contract's success message. The test path was also corrected to `/auth/register` to match the current app mounting. After these corrections, the user confirmed that all tests passed.

## 4. Problems encountered and lessons learned

### Unit test versus integration test

- Schema and service tests are unit tests because they isolate a component and mock external dependencies.
- The registration HTTP integration test exercises the Express route, validation middleware, controller, service, repository, and PostgreSQL together.

### PostgreSQL unique violations

- An application-level existence check alone cannot prevent duplicate inserts under concurrent requests.
- Database unique constraints are authoritative.
- PostgreSQL code `23505` indicates a unique violation; the violated constraint name is needed to distinguish email from phone conflicts.
- Expected constraint conflicts should become domain-specific `AppError` instances; unexpected database errors should not be mislabeled as conflicts.

### Express 5 asynchronous error handling

- Express 5 automatically forwards rejected promises from async route handlers to error middleware.
- `try/catch` is not required merely to forward errors.
- Catching is useful when code intentionally translates an error into a different application-level error.

### Database model versus API representation

- Internal column names such as `email_isverified` need not match public API fields such as `emailVerified`.
- Controllers should explicitly construct public response objects instead of exposing raw database rows.
- Request and response types should remain separate because request input includes a password and public responses must not.

### API contract versus route mounting

- The written API contract specifies `/api/v1` as a base URL, but the current app and prior tests use `/auth/...`.
- Tests should reflect the app as it currently runs, while the version-prefix discrepancy remains an explicit contract/routing follow-up—not something to silently mix into an unrelated test fix.

## 5. Current status

**Completed:** registration schema, repository functions, service logic, PostgreSQL uniqueness-error mapping, controller response mapping, route wiring, schema/service unit tests, and registration integration tests.

**Verification:** the user confirmed all tests passed. No claim is made here that a new Git commit has already been created.

## 6. Next steps

### Immediate

1. Review `git status` and inspect the diff.
2. Run the build, unit tests, and integration tests once more before committing.
3. Commit the feature when the working tree and test results are satisfactory.

Suggested commit message:

```bash
git add .
git commit -m "feat(auth): implement user registration"
```

### Next feature: email verification

1. Review the current `users` verification columns and their spelling in the real schema before writing SQL. The current schema includes `email_verfication_token_hash` (note the existing spelling), `email_verification_token_expiresat`, `email_isverified`, and `pending_email`.
2. Decide and document the verification-code/token format and expiry behavior in line with the existing auth API contract.
3. Generate a cryptographically secure verification secret/code.
4. Store only a hash of the secret and its expiry; never store or return the raw secret.
5. Implement the verification request/resend flow with rate limiting and a generic response that does not reveal whether an email exists.
6. Implement verification submission: validate the code, reject invalid/expired codes, mark the email verified, and invalidate the stored verification secret.
7. Add unit tests for token/code generation and service logic.
8. Add integration tests for successful verification, invalid code, expired code, repeated use, and already-verified accounts.
9. Ensure login succeeds only when the email is verified, preserving the existing login rule.

### Follow-up consistency check

Resolve whether `/api/v1` should be mounted in `src/app.ts`. If versioning is adopted, update the application mount and all existing integration tests together, and keep the API contract synchronized.

## 7. Learning summary

This feature reinforced how to build a backend feature in layers: validate input at the boundary, keep SQL in the repository, put business rules in the service, construct a safe HTTP representation in the controller, wire middleware in the router, and verify each layer with appropriate tests. It also demonstrated why database constraints, application error mapping, API contracts, and integration tests all matter even when the happy path appears straightforward.
