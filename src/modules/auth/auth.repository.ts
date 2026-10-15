import { pool } from "../../config/database";

export async function findUserByIdentifier(identifier: string) {

    const result = await pool.query(
        "SELECT email, phone, id, password_hash, name, email_isverified FROM users WHERE email = $1 OR phone = $1 LIMIT 1",
        [identifier]
    );

    return result.rows[0] ?? null;


}

export async function createAuthSession(userId: bigint, refreshTokenHash: string) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Set expiration to 30 days from now
    const result = await pool.query(
        "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id",
        [userId, refreshTokenHash, expiresAt]
    );
    return result.rows[0] ?? null;
}

export async function findAuthSessionByTokenHash(tokenHash: string) {

    const result = await pool.query(
        "SELECT * FROM auth_sessions WHERE token_hash = $1 LIMIT 1",
        [tokenHash]
    );
    return result.rows[0] ?? null;
}

export async function rotateRefreshToken(sessionId: bigint, newTokenHash: string, oldTokenHash: string) {
    const result = await pool.query(
        "UPDATE auth_sessions SET token_hash = $1 WHERE id = $2 AND token_hash = $3 AND expires_at > NOW() AND revoked_at IS NULL",
        [newTokenHash, sessionId, oldTokenHash]
    );
    return result.rowCount === 1;
}

export async function revokeAuthSession(sessionId: bigint, userId: bigint) {
    const result = await pool.query(
        "UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
        [sessionId, userId]
    );
    return result.rowCount === 1;
}


export async function findUserByEmail(email: string) {
    const result = await pool.query(
        "SELECT id, email_isverified FROM users WHERE email = $1 LIMIT 1",
        [email]
    );

    return result.rows[0] ?? null;
}

export async function findUserByPhone(phone: string) {
    const result = await pool.query(
        "SELECT id FROM users WHERE phone = $1 LIMIT 1",
        [phone]
    );
    return result.rows[0] ?? null;
}

export async function createUser(name: string, email: string, phone: string | null, passwordHash: string) {
    const result = await pool.query(
        "INSERT INTO users (name, email, phone, password_hash, email_isverified) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, email_isverified",
        [name, email, phone, passwordHash, false]
    );
    return result.rows[0] ?? null;
}


export async function saveEmailVerificationCode(
    userId: string,
    tokenHash: string,
    expiresAt: Date
): Promise<boolean> {
    const result = await pool.query(
        `UPDATE users
         SET email_verification_token_hash = $1,
             email_verification_token_expiresat = $2
         WHERE id = $3
           AND email_isverified = FALSE`,
        [tokenHash, expiresAt, userId]
    );

    return result.rowCount === 1;
}
export async function clearVerificationCode(userId: string): Promise<boolean> {
    const result = await pool.query(
        `UPDATE users
         SET email_verification_token_hash = NULL,
             email_verification_token_expiresat = NULL
         WHERE id = $1
           AND email_isverified = FALSE`,
        [userId]
    );

    return result.rowCount === 1;
}

export async function findUserForEmailVerification(email: string) {
    const result = await pool.query(
        `SELECT
            id,
            email_isverified,
            email_verification_token_hash,
            email_verification_token_expiresat
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
    );

    return result.rows[0] ?? null;
}

export async function markEmailAsVerified(
    userId: string,
    expectedTokenHash: string
): Promise<boolean> {
    const result = await pool.query(
        `UPDATE users
         SET email_isverified = TRUE,
             email_verification_token_hash = NULL,
             email_verification_token_expiresat = NULL
         WHERE id = $1
           AND email_isverified = FALSE
           AND email_verification_token_hash = $2
           AND email_verification_token_expiresat > NOW()
         RETURNING id`,
        [userId, expectedTokenHash]
    );

    return result.rows.length === 1;
}


export async function findUserForPasswordReset(email: string) {
    const result = await pool.query(
        `SELECT id, email, email_isverified
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
    );

    return result.rows[0] ?? null;
}

export async function savePasswordResetCode(
    userId: string,
    tokenHash: string,
    expiresAt: Date
): Promise<boolean> {
    const result = await pool.query(
        `UPDATE users
         SET password_reset_token_hash = $1,
             password_reset_token_expires_at = $2
         WHERE id = $3`,
        [tokenHash, expiresAt, userId]
    );

    return result.rowCount === 1;
}

export async function findUserForPasswordResetCode(email: string) {
    const result = await pool.query(
        `SELECT
            id,
            password_reset_token_hash,
            password_reset_token_expires_at
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
    );

    return result.rows[0] ?? null;
}

export async function updatePasswordAndConsumeResetCode(
    userId: string,
    expectedTokenHash: string,
    newPasswordHash: string
): Promise<boolean> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE users
             SET password_hash = $1,
                 password_reset_token_hash = NULL,
                 password_reset_token_expires_at = NULL
             WHERE id = $2
               AND password_reset_token_hash = $3
               AND password_reset_token_expires_at > NOW()
             RETURNING id`,
            [newPasswordHash, userId, expectedTokenHash]
        );

        // The code was invalid, expired, or already consumed.
        if (result.rowCount !== 1) {
            await client.query("ROLLBACK");
            return false;
        }

        // A password reset invalidates existing login sessions.
        await client.query(
            `UPDATE auth_sessions
             SET revoked_at = NOW()
             WHERE user_id = $1
               AND revoked_at IS NULL`,
            [userId]
        );

        await client.query("COMMIT");
        return true;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}


export async function clearPasswordResetCode(
    userId: string,
    expectedTokenHash: string,
    expectedExpiresAt: Date
): Promise<boolean> {
    const result = await pool.query(
        `UPDATE users
         SET password_reset_token_hash = NULL,
             password_reset_token_expires_at = NULL
         WHERE id = $1
           AND password_reset_token_hash = $2
           AND password_reset_token_expires_at = $3`,
        [userId, expectedTokenHash, expectedExpiresAt]
    );

    return result.rowCount === 1;
}





