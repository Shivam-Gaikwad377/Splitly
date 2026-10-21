# Splitly Project Log — 1 October 2026

## Agenda

Complete the **Refresh Token flow**, verify refresh-token rotation through automated integration tests, and strengthen the understanding of the authentication architecture built in Splitly.

Today's work moved authentication from a working Login endpoint to a tested Login → Refresh lifecycle.

---

## 1. Cookie Parsing — Implemented ✅

Splitly did not initially have cookie parsing configured.

Added `cookie-parser` so Express can read the refresh-token cookie from incoming requests.

### Middleware flow

```text
HTTP request
    ↓
Cookie: refreshToken=<token>
    ↓
cookie-parser
    ↓
req.cookies.refreshToken
```

Installed:

```text
cookie-parser
@types/cookie-parser
```

Registered the middleware before routes.

### Important learning

`cookie-parser` only parses incoming cookies. It does not validate, rotate, hash, or authenticate refresh tokens.

The application still uses `res.cookie(...)` to send the refresh token back to the client.

---

## 2. Refresh Cookie Validation Middleware — Implemented ✅

A validation middleware was added for the refresh endpoint.

Its responsibility is limited to checking whether the required `refreshToken` cookie exists.

Conceptually:

```text
refreshToken cookie exists?
        ↓
   yes → next()
   no  → AppError
```

The middleware does **not** decide whether the token is valid, revoked, expired, or already rotated.

Those decisions belong to the authentication service.

### Architecture learned

```text
Validation middleware
→ Is the required input present / structurally valid?

Service
→ Is the credential actually valid?

Repository
→ What should PostgreSQL do?
```

This reinforced the distinction between request validation and authentication/business logic.

---

## 3. Understanding `AppError` vs API Response Types

Clarified that `AppError` and API response interfaces solve different problems.

### `AppError`

`AppError` is a **class** because it is a runtime object that can be thrown:

```text
throw new AppError(...)
```

It belongs in `utils` because it contains runtime error behavior/data.

### API response type

The uniform API response is a **TypeScript interface**, used to describe response shape.

The shared type belongs under `src/types/` because it is a compile-time contract rather than runtime behavior.

### General distinction learned

```text
AppError
→ runtime class
→ thrown and handled

ApiResponse<T>
→ compile-time interface
→ describes JSON structure
```

---

## 4. Uniform API Response Contract

Splitly adopted a generic success response contract instead of creating a separate response wrapper for every endpoint.

Conceptual shape:

```text
ApiResponse<T>
├── success
├── message
└── data
```

For example, Refresh returns only the access token in JSON because the raw refresh token belongs in the HttpOnly cookie.

### Authentication response separation

```text
JSON response
→ access token + safe data

HttpOnly cookie
→ raw refresh token

PostgreSQL
→ refresh token hash
```

This preserves the security boundary already established during Login.

---

## 5. Refresh Repository Layer — Completed ✅

Implemented the repository operation to locate a session by refresh-token hash.

Conceptually:

```text
findAuthSessionByTokenHash(tokenHash)
```

It queries `auth_sessions.token_hash` and returns the matching session or `null`.

### Repository responsibility

The repository retrieves the database state.

It does not decide whether the session is authenticated/valid.

---

## 6. Refresh Token Rotation Repository Operation — Completed ✅

Implemented an atomic token-hash replacement operation.

The repository updates the stored hash only when the current hash still matches the old hash.

The current implementation also checks that the session is not revoked and has not expired during the update.

Conceptually:

```text
UPDATE auth_sessions
SET token_hash = newTokenHash
WHERE
    id = sessionId
    AND token_hash = oldTokenHash
    AND expires_at > NOW()
    AND revoked_at IS NULL
```

The repository returns a boolean result:

```text
true
→ one row updated → rotation succeeded

false
→ zero rows updated → old token is no longer current / session no longer valid
```

### Important learning

`RETURNING *` was unnecessary because the service does not need the updated session row. It only needs to know whether the update happened.

This reinforced the principle:

> Do not fetch database data that the caller does not use.

---

## 7. Concurrency / Race-Condition Reasoning — Learned

A major part of today's work was understanding why token rotation must be conditional.

Potential race:

```text
Request 1                 Request 2
Token A                   Token A
   ↓                         ↓
validate A                validate A
   ↓                         ↓
rotate A → B              rotate A → C
```

Without an atomic condition, both requests could potentially succeed.

With the current conditional update:

```text
Request 1
A → B
UPDATE matches → success

Request 2
A → C
UPDATE no longer matches → 0 rows
```

Therefore only one request can successfully rotate a given old refresh token.

### Important distinction

The repository reports what happened in PostgreSQL.

The service interprets that result:

```text
row updated
→ rotation succeeded

0 rows updated
→ refresh credential is no longer usable
→ reject with 401
```

The client does not need to be told whether the token was already rotated, revoked, or otherwise invalid.

---

## 8. Understanding Session Revocation — Learned

Clarified when a session becomes revoked.

A session is explicitly invalidated by setting:

```text
revoked_at = timestamp
```

The state means:

```text
revoked_at = NULL
→ session has not been revoked

revoked_at != NULL
→ session has been revoked
```

The primary future use case is Logout:

```text
User logs out
    ↓
identify current session
    ↓
set revoked_at = NOW()
    ↓
refresh session becomes unusable
```

Refresh itself does not revoke the session. It rotates the token hash while keeping the same session.

---

## 9. Refresh Service — Completed ✅

The Refresh service now coordinates the complete authentication workflow.

### Final reasoning flow

```text
old refresh token
        ↓
hash old token
        ↓
find auth session
        ↓
session exists?
   ├── no → reject 401
   └── yes
        ↓
is revoked?
   ├── yes → reject 401
   └── no
        ↓
is expired?
   ├── yes → reject 401
   └── no
        ↓
generate new refresh token
        ↓
hash new refresh token
        ↓
atomically replace old hash
        ↓
update succeeded?
   ├── no → reject 401
   └── yes
        ↓
generate new access token
        ↓
return new credentials to controller
```

### Authentication reasoning learned

The service answers:

> Is this refresh credential currently allowed to create a new access token?

Only after the existing session passes all validation checks does rotation occur.

---

## 10. Why the Refresh Token Must Change — Learned

Clarified the core meaning of refresh-token rotation.

Changing only the access token does **not** implement refresh-token rotation.

The actual rotation is:

```text
Refresh Token A
        ↓
validate A
        ↓
replace A with Refresh Token B
        ↓
Token A becomes invalid
```

The access token is regenerated as part of the refresh operation, but the security property called **rotation** specifically refers to replacing the refresh credential.

### Mental model

```text
Access token
→ short-lived API credential

Refresh token
→ long-lived credential that grants permission to refresh
```

---

## 11. Controller Layer — Completed ✅

The Refresh controller now has HTTP-level responsibilities only.

### Controller flow

```text
read refreshToken cookie
        ↓
call refresh service
        ↓
receive new access token + new refresh token
        ↓
set new refreshToken cookie
        ↓
return uniform success response
```

The controller does not:

```text
query PostgreSQL
hash tokens
validate expiry
check revocation
perform token rotation
```

Those responsibilities remain in the service/repository layers.

### Cookie configuration

The same security configuration used by Login is used when replacing the refresh cookie:

```text
httpOnly: true
secure: production only
sameSite: strict
maxAge: 30 days
```

---

## 12. HTTP Status Reasoning — Learned

For an unusable refresh credential, the endpoint returns:

```text
401 Unauthorized
```

This includes:

```text
missing refresh token
unknown refresh token
expired session
revoked session
already-rotated old token
```

Externally these are treated as an invalid refresh credential rather than exposing unnecessary internal state.

---

## 13. TypeScript / Express Cookie Typing — Solved ✅

Encountered a TypeScript issue where `req.cookies` was not recognized.

The cause was missing `@types/cookie-parser` typings.

After adding the type package, `RequestHandler` correctly gained access to:

```text
req.cookies
```

### Important learning

`RequestHandler` is the type of the middleware function; it is not the request object itself.

The request object remains:

```text
req
```

and cookie-parser's type declarations augment the Express request type with:

```text
req.cookies
```

---

## 14. Testing Strategy — Learned

Splitly now distinguishes between **unit tests** and **integration tests**.

### Unit tests

Purpose:

> Does this individual function behave correctly in isolation?

Examples for Splitly:

```text
generateRefreshToken()
hashRefreshToken()
signAccessToken()
verifyAccessToken()
```

These can be tested without Express or PostgreSQL.

### Integration tests

Purpose:

> Does the complete feature work across the application stack?

For authentication:

```text
HTTP request
    ↓
validation middleware
    ↓
controller
    ↓
service
    ↓
repository
    ↓
PostgreSQL
```

Therefore Login and Refresh API tests belong under:

```text
tests/integration/auth/
```

not under `unit`.

---

## 15. Vitest + Supertest — Implemented ✅

Added Vitest to the project and configured test scripts.

Current test commands include:

```text
npm test
npm run test:run
npm run test:integration
npm run test:unit
```

Supertest was introduced for HTTP integration testing against the exported Express app.

The Express application is exported from `src/app.ts`, which allows tests to exercise the application without starting the actual HTTP server from `src/server.ts`.

### Important architecture learned

```text
Tests
  ↓
import app from src/app
  ↓
Supertest
  ↓
Express application
```

The test suite should not start another `app.listen(...)` process.

---

## 16. Cookie Testing With Supertest — Learned

Using a cookie-based refresh flow requires testing cookie persistence correctly.

`request.agent(app)` was introduced as the useful mechanism for integration tests that need the same client session across multiple requests.

Conceptually:

```text
agent
  ↓
POST /auth/login
  ↓
refresh cookie stored by agent
  ↓
POST /auth/refresh
  ↓
cookie automatically sent
```

This is a better representation of the browser/client flow than manually putting the refresh token into request bodies.

---

## 17. Testing Mistake That Was Corrected — Access Token Equality

One test initially asserted that the access token from two immediate refresh requests must be different.

That assumption was incorrect.

The JWT payload is based on stable identity/session claims plus timing claims. Two refresh operations performed within the same timing boundary can legitimately produce the same JWT payload/signature.

Therefore:

```text
Different access token
≠
proof of refresh-token rotation
```

The correct thing to test is refresh-token rotation itself:

```text
Refresh Token A
→ Refresh
→ Refresh Token B

Refresh Token B
→ Refresh
→ Refresh Token C
```

The refresh credential must change.

The access token only needs to be a valid usable access credential.

This was an important correction to the test logic.

---

## 18. Automated Login Tests — Passed ✅

The integration test suite verifies successful and failed Login behavior.

Covered cases include:

```text
✅ valid credentials
✅ incorrect password
✅ unknown user
✅ missing identifier
✅ missing password
✅ access token returned
✅ refresh token not included in JSON
✅ refresh token delivered through cookie
✅ auth session created
✅ session expiry populated
✅ revoked_at starts NULL
✅ failed authentication does not create a session
```

The Login tests passed.

---

## 19. Automated Refresh Tests — Passed ✅

The integration suite verifies the Refresh endpoint.

Covered cases include:

```text
✅ successful refresh
✅ missing refresh cookie
✅ fake refresh token
✅ expired session
✅ revoked session
✅ refresh token rotation
✅ new refresh token can continue refreshing
✅ same auth session is maintained during rotation
✅ stored token hash changes during rotation
```

The Refresh tests passed.

---

## 20. Test Database Awareness — Learned

Integration tests directly exercise PostgreSQL, so test data must not be treated like normal development data.

The current authentication seed is useful for manual testing but should not be the long-term mechanism for repeatable automated integration tests because it performs a direct insert and can collide with existing rows.

The project currently does not have a migration system.

### Current implication

A dedicated test database should eventually be used:

```text
Development database
→ normal development

Test database
→ automated integration tests
```

This should be formalized before the test suite becomes significantly larger.

---

## 21. Important Current Auth Architecture

The authentication lifecycle is now:

```text
LOGIN

credentials
    ↓
user lookup
    ↓
password verification
    ↓
email verification
    ↓
generate refresh token
    ↓
hash refresh token
    ↓
create auth session
    ↓
generate access token
    ↓
set HttpOnly refresh cookie
    ↓
return access token + safe user data
```

Then:

```text
REFRESH

refresh cookie
    ↓
hash token
    ↓
find auth session
    ↓
validate session
    ↓
generate new refresh token
    ↓
atomically replace stored hash
    ↓
generate access token
    ↓
replace HttpOnly refresh cookie
    ↓
return access token
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
```

---

## 22. What Was Built Today

```text
✅ cookie-parser integration
✅ cookie-parser TypeScript types
✅ refresh cookie validation middleware
✅ refresh session repository lookup
✅ atomic refresh-token hash rotation
✅ Refresh service
✅ Refresh controller
✅ uniform success response usage
✅ Vitest setup
✅ integration test structure
✅ Login integration tests
✅ Refresh integration tests
✅ database assertions in integration tests
✅ cookie-based test flow with Supertest
```

---

## 23. What Was Learned Today

```text
✅ difference between AppError class and response interfaces
✅ difference between validation and authentication
✅ repository vs service responsibility
✅ why refresh-token rotation must replace the refresh credential
✅ why the refresh token must be hashed in the database
✅ why 401 is appropriate for invalid refresh credentials
✅ how session revocation works through revoked_at
✅ how session expiry works through expires_at
✅ why conditional database updates protect token rotation from races
✅ why RETURNING * is unnecessary when only row count is needed
✅ why access-token equality is not a valid rotation test
✅ difference between unit and integration tests
✅ how Supertest exercises an exported Express app
✅ how request.agent() helps model cookie-based sessions
✅ how TypeScript declaration packages affect Express middleware types
```

---

## 24. What Was Not Finished / Remaining Gaps

These were intentionally not treated as completed today:

```text
⬜ Logout endpoint
⬜ explicit old-token-reuse test using the original stale cookie
⬜ concurrent refresh integration test
⬜ dedicated automated test database configuration
⬜ rate limiting
⬜ broader auth test coverage
⬜ production hardening
```

The core Login + Refresh feature is working and its current integration tests pass, but the remaining tests above are important hardening work rather than reasons to redesign the current authentication architecture.

---

## Today's Main Milestone

**Splitly's authentication lifecycle now works through Login and Refresh, with refresh-token rotation backed by a server-side auth session and verified through automated integration tests.**

The project has moved from manually verified authentication behavior to repeatable automated verification.

---

## Next Session

The natural next authentication feature is:

```text
LOGIN ✅
   ↓
REFRESH ✅
   ↓
LOGOUT ⬅ NEXT
```

Logout should:

```text
authenticate current session
    ↓
revoke auth session
    ↓
clear refresh cookie
    ↓
return success response
```

After Logout, the next hardening pass can focus on the stale-token reuse test, concurrency testing, rate limiting, and broader authentication coverage.
