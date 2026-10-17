SPLITLY AUTHENTICATION — NOTES

1. Access Token
   
   - Short-lived JWT.
   - Sent with normal API requests:
     Authorization: Bearer <accessToken>
   - Target lifetime: ~15 minutes.
   - Contains:
       sub = user ID
       sid = session ID
       iat = issued time
       exp = expiry time

2. Refresh Token
   
   - Long-lived.
   - Opaque random token, NOT a JWT.
   - Stored in HttpOnly + Secure cookie.
   - Raw token is NEVER stored in PostgreSQL.
   - Only its hash is stored.
   - Target lifetime: ~30 days.
   - Rotated whenever /auth/refresh succeeds.

3. Auth Session
   
   - Stored separately from users.
   - One user can have multiple sessions/devices.
   - New table: auth_sessions

4. Authentication Middleware
   
   - Reads access token.
   - Verifies JWT.
   - Extracts user/session identity.
   - Adds:
       req.user.id
       req.user.sessionId
   - Does NOT perform authorization/business checks.

5. Authentication vs Authorization
   Authentication:
   "Who are you?"
   Authorization:
   "Are you allowed to do this?"

6. Logout
   
   - Revoke current auth session.
   - Clear refresh-token cookie.
   - Access token may technically remain valid until its short expiry.
   - Do NOT build a JWT blacklist for now.

7. Refresh
   
   - Browser sends refresh cookie.
   - Server validates session.
   - Old refresh token becomes invalid.
   - New refresh token is issued.
   - New access token is returned.

8. /auth/me
   
   - Protected by auth middleware.
   - Uses req.user.id.
   - Fetches current user.

9. Users table
   
   - No refresh_token column.
   - Keep authentication sessions separate.

10. Security
    
    - Never expose password hash.
    - Never expose refresh token.
    - Never expose verification/reset secrets.
    - Authentication endpoints need rate limiting.
