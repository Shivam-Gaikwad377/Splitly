
import request from "supertest";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";
import bcrypt from "bcryptjs";

import app from "../../../src/app";
import { pool } from "../../../src/config/database";
import { signAccessToken } from "../../../src/utils/auth/jwt";

const TEST_EMAIL = "me-route-test@splitly.dev";
const TEST_PASSWORD = "Test@12345";
const TEST_NAME = "Current User Test";

// A valid PostgreSQL BIGINT that should not identify a real test user.
const MISSING_USER_ID = "9223372036854775807";
const TEST_SESSION_ID = "9223372036854775806";

async function createTestUser(): Promise<void> {
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
        [TEST_EMAIL, passwordHash, TEST_NAME, null, true],
    );
}

async function cleanupTestData(): Promise<void> {
    await pool.query(
        `
        DELETE FROM auth_sessions
        WHERE user_id = (
            SELECT id FROM users WHERE email = $1
        )
        `,
        [TEST_EMAIL],
    );

    await pool.query(
        `DELETE FROM users WHERE email = $1`,
        [TEST_EMAIL],
    );
}

async function cleanupSessions(): Promise<void> {
    await pool.query(
        `
        DELETE FROM auth_sessions
        WHERE user_id = (
            SELECT id FROM users WHERE email = $1
        )
        `,
        [TEST_EMAIL],
    );
}

async function getUserId(): Promise<string> {
    const result = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [TEST_EMAIL],
    );

    const userId = result.rows[0]?.id;

    if (userId === undefined) {
        throw new Error("Test user was not created");
    }

    return String(userId);
}

async function loginAndGetAccessToken(): Promise<string> {
    const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
            identifier: TEST_EMAIL,
            password: TEST_PASSWORD,
        });

    expect(response.status).toBe(200);

    const accessToken = response.body.data?.accessToken;

    expect(accessToken).toEqual(expect.any(String));

    return accessToken as string;
}

describe("GET /api/v1/auth/me", () => {
    beforeAll(async () => {
        await cleanupTestData();
        await createTestUser();
    });

    beforeEach(async () => {
        await cleanupSessions();
    });

    afterAll(async () => {
        try {
            await cleanupTestData();
        } finally {
            await pool.end();
        }
    });

    it("should return the authenticated user's profile", async () => {
        const accessToken = await loginAndGetAccessToken();
        const userId = await getUserId();

        const response = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            success: true,
            message: "Current user retrieved successfully",
            data: {
                user: {
                    id: userId,
                    name: TEST_NAME,
                    email: TEST_EMAIL,
                    phone: null,
                    emailVerified: true,
                },
            },
        });
    });

    it("should not expose password hashes or verification secrets", async () => {
        const accessToken = await loginAndGetAccessToken();

        const response = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        const user = response.body.data.user;

        expect(Object.keys(user).sort()).toEqual(
            [
                "email",
                "emailVerified",
                "id",
                "name",
                "phone",
            ].sort(),
        );

        expect(user).not.toHaveProperty("password_hash");
        expect(user).not.toHaveProperty("email_verification_token_hash");
        expect(user).not.toHaveProperty("password_reset_token_hash");
    });

    it("should reject requests without an access token", async () => {
        const response = await request(app)
            .get("/api/v1/auth/me");

        expect(response.status).toBe(401);

        expect(response.body).toEqual({
            success: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
        });
    });

    it("should reject a valid JWT when its session does not exist", async () => {
        const userId = await getUserId();

        // beforeEach removes this user's sessions.
        const accessToken = signAccessToken(
            userId,
            TEST_SESSION_ID
        );

        const response = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(response.status).toBe(401);

        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INVALID_ACCESS_TOKEN",
                message: "Invalid or expired access token",
            },
        });
    });

    it("should reject an access token after its session is revoked", async () => {
        const accessToken = await loginAndGetAccessToken();

        await pool.query(
            `UPDATE auth_sessions
         SET revoked_at = NOW()
         WHERE user_id = (
             SELECT id FROM users WHERE email = $1
         )`,
            [TEST_EMAIL]
        );

        const response = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe("INVALID_ACCESS_TOKEN");
    });

    it("should reject a token when the authenticated user no longer exists", async () => {
        const existingUser = await pool.query(
            `SELECT id FROM users WHERE id = $1`,
            [MISSING_USER_ID],
        );

        expect(existingUser.rowCount).toBe(0);

        const accessToken = signAccessToken(
            MISSING_USER_ID,
            TEST_SESSION_ID,
        );

        const response = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(response.status).toBe(401);

        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INVALID_ACCESS_TOKEN",
                message: "Invalid or expired access token",
            },
        });
    });
});
