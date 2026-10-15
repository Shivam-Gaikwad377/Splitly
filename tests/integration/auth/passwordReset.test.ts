
import request from "supertest";
import bcrypt from "bcryptjs";
import {
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
}));

vi.mock("../../../src/utils/emails/brevoEmail", () => ({
    sendVerificationEmail: mocks.sendVerificationEmail,
    sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));

import app from "../../../src/app";
import { pool } from "../../../src/config/database";
import { env } from "../../../src/config/env";
import {
    hashEmailVerificationCode,
} from "../../../src/utils/auth/emailVerificationCode";

const TEST_EMAIL = "password-reset-integration@splitly.dev";
const MISSING_EMAIL = "missing-password-reset@splitly.dev";

const TEST_PASSWORD = "CurrentPassword123!";
const NEW_PASSWORD = "NewStrongPassword123!";
const TEST_CODE = "483921";

type SeedOptions = {
    emailVerified?: boolean;
    code?: string | null;
    expiresAt?: Date | null;
};

async function cleanupTestData() {
    await pool.query(
        `DELETE FROM auth_sessions
         WHERE user_id IN (
             SELECT id FROM users WHERE email = ANY($1::text[])
         )`,
        [[TEST_EMAIL, MISSING_EMAIL]],
    );

    await pool.query(
        "DELETE FROM users WHERE email = ANY($1::text[])",
        [[TEST_EMAIL, MISSING_EMAIL]],
    );
}

async function createTestUser({
    emailVerified = true,
    code = null,
    expiresAt = null,
}: SeedOptions = {}): Promise<string> {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const tokenHash = code
        ? hashEmailVerificationCode(
              code,
              env.emailVerification.secret,
          )
        : null;

    const result = await pool.query(
        `INSERT INTO users (
            name,
            email,
            phone,
            password_hash,
            email_isverified,
            password_reset_token_hash,
            password_reset_token_expires_at
        )
        VALUES ($1, $2, NULL, $3, $4, $5, $6)
        RETURNING id`,
        [
            "Password Reset Test User",
            TEST_EMAIL,
            passwordHash,
            emailVerified,
            tokenHash,
            expiresAt,
        ],
    );

    return String(result.rows[0].id);
}

function forgotPasswordRequest(email = TEST_EMAIL) {
    return request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email });
}

function resetPasswordRequest(
    email: string,
    code: string,
    newPassword = NEW_PASSWORD,
) {
    return request(app)
        .post(
            `/api/v1/auth/reset-password?email=${encodeURIComponent(email)}`,
        )
        .send({ code, newPassword });
}

describe("Password reset routes", () => {
    beforeEach(async () => {
        await cleanupTestData();

        vi.clearAllMocks();

        mocks.sendVerificationEmail.mockResolvedValue(undefined);
        mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    });

    afterAll(async () => {
        await cleanupTestData();
        await pool.end();
    });

    describe("POST /api/v1/auth/forgot-password", () => {
        it("returns 202 and sends a code for an eligible account", async () => {
            await createTestUser();

            const response = await forgotPasswordRequest();

            expect(response.status).toBe(202);
            expect(response.body).toEqual({
                success: true,
                message:
                    "If an account exists for this email, password-reset instructions will be sent.",
                data: null,
            });

            expect(
                mocks.sendPasswordResetEmail,
            ).toHaveBeenCalledOnce();

            expect(
                mocks.sendPasswordResetEmail,
            ).toHaveBeenCalledWith(
                TEST_EMAIL,
                expect.stringMatching(/^\d{6}$/),
            );

            const sentCode =
                mocks.sendPasswordResetEmail.mock.calls[0][1];

            const result = await pool.query(
                `SELECT
                    password_reset_token_hash,
                    password_reset_token_expires_at
                 FROM users
                 WHERE email = $1`,
                [TEST_EMAIL],
            );

            expect(
                result.rows[0].password_reset_token_hash,
            ).toBe(
                hashEmailVerificationCode(
                    sentCode,
                    env.emailVerification.secret,
                ),
            );

            expect(
                result.rows[0].password_reset_token_expires_at,
            ).toBeInstanceOf(Date);

            expect(
                result.rows[0].password_reset_token_expires_at.getTime(),
            ).toBeGreaterThan(Date.now());
        });

        it("returns the same generic response for an unknown email", async () => {
            const response = await forgotPasswordRequest(
                MISSING_EMAIL,
            );

            expect(response.status).toBe(202);
            expect(response.body).toEqual({
                success: true,
                message:
                    "If an account exists for this email, password-reset instructions will be sent.",
                data: null,
            });

            expect(
                mocks.sendPasswordResetEmail,
            ).not.toHaveBeenCalled();
        });

        it("returns the generic response if email delivery fails", async () => {
            await createTestUser();

            mocks.sendPasswordResetEmail.mockRejectedValueOnce(
                new Error("Brevo unavailable"),
            );

            const response = await forgotPasswordRequest();

            expect(response.status).toBe(202);
            expect(response.body).toEqual({
                success: true,
                message:
                    "If an account exists for this email, password-reset instructions will be sent.",
                data: null,
            });

            const result = await pool.query(
                `SELECT
                    password_reset_token_hash,
                    password_reset_token_expires_at
                 FROM users
                 WHERE email = $1`,
                [TEST_EMAIL],
            );

            // The service attempts conditional cleanup after delivery fails.
            expect(
                result.rows[0].password_reset_token_hash,
            ).toBeNull();

            expect(
                result.rows[0].password_reset_token_expires_at,
            ).toBeNull();
        });

        it("rejects a malformed email with 400", async () => {
            const response = await request(app)
                .post("/api/v1/auth/forgot-password")
                .send({ email: "not-an-email" });

            expect(response.status).toBe(400);
            expect(
                mocks.sendPasswordResetEmail,
            ).not.toHaveBeenCalled();
        });
    });

    describe("POST /api/v1/auth/reset-password", () => {
        it("updates the password, consumes the code, and revokes sessions", async () => {
            const userId = await createTestUser({
                code: TEST_CODE,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            });

            await pool.query(
                `INSERT INTO auth_sessions (
                    user_id,
                    token_hash,
                    expires_at
                 )
                 VALUES ($1, $2, $3)`,
                [
                    userId,
                    "test-refresh-token-hash",
                    new Date(Date.now() + 24 * 60 * 60 * 1000),
                ],
            );

            const response = await resetPasswordRequest(
                TEST_EMAIL,
                TEST_CODE,
            );

            expect(response.status).toBe(204);

            const userResult = await pool.query(
                `SELECT
                    password_hash,
                    password_reset_token_hash,
                    password_reset_token_expires_at
                 FROM users
                 WHERE id = $1`,
                [userId],
            );

            const user = userResult.rows[0];

            expect(
                await bcrypt.compare(
                    NEW_PASSWORD,
                    user.password_hash,
                ),
            ).toBe(true);

            expect(
                user.password_reset_token_hash,
            ).toBeNull();

            expect(
                user.password_reset_token_expires_at,
            ).toBeNull();

            const sessionResult = await pool.query(
                `SELECT revoked_at
                 FROM auth_sessions
                 WHERE user_id = $1`,
                [userId],
            );

            expect(sessionResult.rows).toHaveLength(1);
            expect(sessionResult.rows[0].revoked_at).toBeInstanceOf(
                Date,
            );
        });

        it("rejects an incorrect code without changing the password", async () => {
            const userId = await createTestUser({
                code: TEST_CODE,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            });

            const response = await resetPasswordRequest(
                TEST_EMAIL,
                "111111",
            );

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe(
                "INVALID_RESET_TOKEN",
            );

            const result = await pool.query(
                `SELECT
                    password_hash,
                    password_reset_token_hash
                 FROM users
                 WHERE id = $1`,
                [userId],
            );

            expect(
                await bcrypt.compare(
                    TEST_PASSWORD,
                    result.rows[0].password_hash,
                ),
            ).toBe(true);

            expect(
                result.rows[0].password_reset_token_hash,
            ).not.toBeNull();
        });

        it("rejects an expired code", async () => {
            await createTestUser({
                code: TEST_CODE,
                expiresAt: new Date(Date.now() - 60 * 1000),
            });

            const response = await resetPasswordRequest(
                TEST_EMAIL,
                TEST_CODE,
            );

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe(
                "INVALID_RESET_TOKEN",
            );
        });

        it("rejects a reused code", async () => {
            await createTestUser({
                code: TEST_CODE,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            });

            const firstResponse = await resetPasswordRequest(
                TEST_EMAIL,
                TEST_CODE,
            );

            expect(firstResponse.status).toBe(204);

            const secondResponse = await resetPasswordRequest(
                TEST_EMAIL,
                TEST_CODE,
            );

            expect(secondResponse.status).toBe(400);
            expect(secondResponse.body.error.code).toBe(
                "INVALID_RESET_TOKEN",
            );
        });

        it("rejects a missing or invalid email query parameter", async () => {
            const response = await request(app)
                .post("/api/v1/auth/reset-password")
                .send({
                    code: TEST_CODE,
                    newPassword: NEW_PASSWORD,
                });

            expect(response.status).toBe(400);
        });

        it("rejects an invalid code format", async () => {
            const response = await resetPasswordRequest(
                TEST_EMAIL,
                "12AB",
            );

            expect(response.status).toBe(400);
        });

        it("rejects a password shorter than eight characters", async () => {
            const response = await resetPasswordRequest(
                TEST_EMAIL,
                TEST_CODE,
                "short",
            );

            expect(response.status).toBe(400);
        });
    });
});

