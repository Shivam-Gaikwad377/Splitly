import request from "supertest";
import {
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import app from "../../../src/app";
import { pool } from "../../../src/config/database";
import { env } from "../../../src/config/env";
import { hashEmailVerificationCode } from "../../../src/utils/auth/emailVerificationCode";

const TEST_EMAIL = "verify-email-integration@splitly.dev";
const TEST_CODE = "483921";
const TEST_NAME = "Verify Email Test User";

type SeedOptions = {
    emailVerified?: boolean;
    code?: string;
    expiresAt?: Date;
    storeCode?: boolean;
};

async function cleanupTestData() {
    await pool.query(
        `DELETE FROM auth_sessions
         WHERE user_id IN (
             SELECT id FROM users WHERE email = $1
         )`,
        [TEST_EMAIL],
    );

    await pool.query(
        "DELETE FROM users WHERE email = $1",
        [TEST_EMAIL],
    );
}

async function createTestUser({
    emailVerified = false,
    code = TEST_CODE,
    expiresAt = new Date(Date.now() + 10 * 60 * 1000),
    storeCode = true,
}: SeedOptions = {}) {
    const tokenHash = storeCode
        ? hashEmailVerificationCode(code, env.emailVerification.secret)
        : null;

    await pool.query(
        `INSERT INTO users (
            name,
            email,
            phone,
            password_hash,
            email_isverified,
            email_verification_token_hash,
            email_verification_token_expiresat
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            TEST_NAME,
            TEST_EMAIL,
            null,
            "integration-test-password-hash",
            emailVerified,
            tokenHash,
            storeCode ? expiresAt : null,
        ],
    );
}

function verifyRequest(email = TEST_EMAIL, code = TEST_CODE) {
    return request(app)
        .post(
            `/api/v1/auth/verify-email?email=${encodeURIComponent(email)}`,
        )
        .send({ code });
}

describe("POST /api/v1/auth/verify-email", () => {
    beforeEach(async () => {
        await cleanupTestData();
        await createTestUser();
    });

    afterAll(async () => {
        await cleanupTestData();
        await pool.end();
    });

    it("verifies the email and clears the stored code", async () => {
        const response = await verifyRequest();

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            message: "Email verified successfully.",
        });
        expect(response.body.data).toBeNull();

        const result = await pool.query(
            `SELECT
                email_isverified,
                email_verification_token_hash,
                email_verification_token_expiresat
             FROM users
             WHERE email = $1`,
            [TEST_EMAIL],
        );

        expect(result.rows[0].email_isverified).toBe(true);
        expect(result.rows[0].email_verification_token_hash).toBeNull();
        expect(
            result.rows[0].email_verification_token_expiresat,
        ).toBeNull();
    });

    it("rejects an incorrect code", async () => {
        const response = await verifyRequest(TEST_EMAIL, "111111");

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_EMAIL_OR_CODE");

        const result = await pool.query(
            "SELECT email_isverified FROM users WHERE email = $1",
            [TEST_EMAIL],
        );

        expect(result.rows[0].email_isverified).toBe(false);
    });

    it("rejects a nonexistent email", async () => {
        const response = await verifyRequest(
            "missing-verify-email@splitly.dev",
            TEST_CODE,
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_EMAIL_OR_CODE");
    });

    it("rejects an expired code", async () => {
        await pool.query(
            `UPDATE users
             SET email_verification_token_expiresat =
                 NOW() - INTERVAL '1 minute'
             WHERE email = $1`,
            [TEST_EMAIL],
        );

        const response = await verifyRequest();

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_EMAIL_OR_CODE");
    });

    it("rejects an already-verified account", async () => {
        await pool.query(
            "UPDATE users SET email_isverified = TRUE WHERE email = $1",
            [TEST_EMAIL],
        );

        const response = await verifyRequest();

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("EMAIL_ALREADY_VERIFIED");
    });

    it("rejects when no verification code has been requested", async () => {
        await pool.query(
            `UPDATE users
             SET email_verification_token_hash = NULL,
                 email_verification_token_expiresat = NULL
             WHERE email = $1`,
            [TEST_EMAIL],
        );

        const response = await verifyRequest();

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_EMAIL_OR_CODE");
    });
});