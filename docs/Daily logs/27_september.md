# Splitly Project Log — 27 September 2026

## Agenda
Authentication foundation and middleware.

---

## Phase 1 — Database / Auth Sessions ✅

Created `auth_sessions` table directly in PostgreSQL/pgAdmin.

Key fields:

```text
id          → BIGINT session ID
user_id     → BIGINT
token_hash  → refresh-token hash
expires_at  → session expiry
revoked_at  → session revocation
created_at  → creation time
```

Relationship:

```text
users 1 ───── N auth_sessions
```

Important decisions:
- One user can have multiple login sessions.
- `session_id` identifies a specific login session.
- Refresh token is never stored in plaintext.
- `revoked_at IS NULL` means active session.
- Development continues on `feature/auth`.
- Accidental `develop` commit was left unchanged; no history rewrite.

---

## Phase 2 — JWT + Token Utilities ✅

### JWT
- Algorithm: **HS256**
- `sub` → user ID
- `sid` → session ID
- `iat` → issued-at
- `exp` → expiration
- Access-token lifetime chosen: **15 minutes**

Implemented:

```text
signAccessToken(userId, sessionId)
verifyAccessToken(accessToken)
```

JWT configuration remains in the existing `env.ts` pattern; Zod was not introduced because the project already has centralized environment handling.

### Refresh Token
- Opaque token, not JWT.
- Generated with Node `crypto.randomBytes(32)`.
- Encoded using Base64URL.
- Raw token goes to the client.
- SHA-256 hash goes into PostgreSQL.

Implemented:

```text
generateRefreshToken()
hashRefreshToken(refreshToken)
```

---

## Phase 3 — Authenticated User Typing ✅

Created:

```text
AuthenticatedUser
├── userId: bigint
└── sessionId: bigint
```

Added Express request typing:

```text
req.user?: AuthenticatedUser
```

Important ID handling:

```text
PostgreSQL BIGINT
→ TypeScript bigint
→ JWT sub/sid as strings
→ convert back to bigint after verification
```

---

## Phase 4 — Authentication Middleware ✅

Implemented `authMiddleware`.

Flow:

```text
Authorization header
        ↓
Validate Bearer format
        ↓
Extract access token
        ↓
Verify JWT
        ↓
Validate sub + sid
        ↓
Convert to bigint
        ↓
req.user = { userId, sessionId }
        ↓
next()
```

Failures return:

```text
401 Unauthorized
```

Claim validation ensures `sub` and `sid` are valid before attaching them to `req.user`.

---

## Key Architecture

```text
Access Token
→ short-lived JWT
→ Authorization: Bearer <token>

Refresh Token
→ long-lived opaque token
→ HttpOnly + Secure cookie
→ hash stored in auth_sessions

Session
→ server-side revocable record
→ identified by session_id
```

The JWT middleware verifies the token, but **database session validation/revocation is still a separate step**.

---

## Status

```text
Phase 1 — ✅ Complete
Phase 2 — ✅ Complete
Phase 3 — ✅ Complete
Phase 4 — ✅ Complete
```

## Next

```text
Session validation
→ Login
→ Refresh
→ Logout
→ /auth/me
```