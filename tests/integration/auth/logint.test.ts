import request from "supertest";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import app from "../../../src/app";
import { pool } from "../../../src/config/database";

const TEST_EMAIL = "login-test@splitly.dev";
const TEST_PASSWORD = "Test@12345";
const TEST_NAME = "Login Test User";

async function createTestUser() {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await pool.query(
        `
        INSERT INTO users (
            email,
            password_hash,
            name,
            phone,
            email_isverified
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
        `,
        [
            TEST_EMAIL,
            passwordHash,
            TEST_NAME,
            null,
            true,
        ]
    );
}

async function cleanupTestData() {
    await pool.query(
        `
        DELETE FROM auth_sessions
        WHERE user_id = (
            SELECT id FROM users WHERE email = $1
        )
        `,
        [TEST_EMAIL]
    );

    await pool.query(
        `DELETE FROM users WHERE email = $1`,
        [TEST_EMAIL]
    );
}

describe("POST /api/v1/auth/login", () => {
    beforeAll(async () => {
        await cleanupTestData();
        await createTestUser();
    });

    afterAll(async () => {
        await cleanupTestData();
        await pool.end();
    });

    it("should login successfully with valid credentials", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: TEST_PASSWORD,
            });

        expect(response.status).toBe(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                message: "Login successful",
                data: expect.objectContaining({
                    accessToken: expect.any(String),
                    user: expect.any(Object),
                }),
            })
        );

        expect(response.body.data.refreshToken).toBeUndefined();

        const setCookie = response.headers["set-cookie"];

        expect(setCookie).toBeDefined();
        expect(String(setCookie)).toContain("refreshToken=");

        const session = await pool.query(
            `
            SELECT
                token_hash,
                revoked_at,
                expires_at
            FROM auth_sessions
            WHERE user_id = (
                SELECT id FROM users WHERE email = $1
            )
            `,
            [TEST_EMAIL]
        );

        expect(session.rowCount).toBe(1);

        expect(session.rows[0].token_hash).toEqual(
            expect.any(String)
        );

        expect(session.rows[0].revoked_at).toBeNull();
        expect(session.rows[0].expires_at).toBeInstanceOf(Date);
    });

    it("should reject an incorrect password", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: "WrongPassword@123",
            });

        expect(response.status).toBe(401);

        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INVALID_CREDENTIALS",
                message: "Invalid credentials",
            },
        });
    });

    it("should reject an unknown user", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                identifier: "does-not-exist@splitly.dev",
                password: TEST_PASSWORD,
            });

        expect(response.status).toBe(401);

        expect(response.body.error.code).toBe(
            "INVALID_CREDENTIALS"
        );
    });

    it("should reject a missing identifier", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                password: TEST_PASSWORD,
            });

        expect(response.status).toBe(400);

        expect(response.body.error.code).toBe(
            "VALIDATION_ERROR"
        );
    });

    it("should reject a missing password", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
            });

        expect(response.status).toBe(400);

        expect(response.body.error.code).toBe(
            "VALIDATION_ERROR"
        );
    });

    it("should not create a session when login fails", async () => {
        await pool.query(
            `
            DELETE FROM auth_sessions
            WHERE user_id = (
                SELECT id FROM users WHERE email = $1
            )
            `,
            [TEST_EMAIL]
        );

        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: "WrongPassword@123",
            });

        expect(response.status).toBe(401);

        const session = await pool.query(
            `
            SELECT id
            FROM auth_sessions
            WHERE user_id = (
                SELECT id FROM users WHERE email = $1
            )
            `,
            [TEST_EMAIL]
        );

        expect(session.rowCount).toBe(0);
    });
    it("should reject login when the email is not verified", async () => {
        await pool.query(
            `UPDATE users SET email_isverified = false WHERE email = $1`,
            [TEST_EMAIL]
        );

        try {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    identifier: TEST_EMAIL,
                    password: TEST_PASSWORD,
                });

            expect(response.status).toBe(403);

            expect(response.body).toEqual({
                success: false,
                error: {
                    code: "EMAIL_NOT_VERIFIED",
                    message: "Email not verified",
                },
            });
        } finally {
            await pool.query(
                `UPDATE users SET email_isverified = true WHERE email = $1`,
                [TEST_EMAIL]
            );
        }
    });
});