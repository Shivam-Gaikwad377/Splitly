import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import app from "../../../src/app";
import { pool } from "../../../src/config/database";

const TEST_EMAIL = "logout-test@splitly.dev";
const TEST_PASSWORD = "Test@12345";
const TEST_NAME = "Logout Test User";

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
        [TEST_EMAIL, passwordHash, TEST_NAME, null, true]
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

async function getUserId(): Promise<string> {
    const result = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [TEST_EMAIL]
    );

    return result.rows[0].id.toString();
}

describe("POST /api/v1/auth/logout", () => {
    beforeAll(async () => {
        await cleanupTestData();
        await createTestUser();
    });

    beforeEach(async () => {
        await pool.query(
            `
            DELETE FROM auth_sessions
            WHERE user_id = (
                SELECT id FROM users WHERE email = $1
            )
            `,
            [TEST_EMAIL]
        );
    });

    afterAll(async () => {
        await cleanupTestData();
        await pool.end();
    });

    it("should revoke the current session and clear the refresh token cookie", async () => {
        const agent = request.agent(app);

        const loginResponse = await agent
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: TEST_PASSWORD,
            });

        expect(loginResponse.status).toBe(200);

        const accessToken = loginResponse.body.data.accessToken;
        expect(accessToken).toEqual(expect.any(String));

        const userId = await getUserId();

        const sessionBefore = await pool.query(
            `
            SELECT id, revoked_at
            FROM auth_sessions
            WHERE user_id = $1
            `,
            [userId]
        );

        expect(sessionBefore.rowCount).toBe(1);
        expect(sessionBefore.rows[0].revoked_at).toBeNull();

        const logoutResponse = await agent
            .post("/api/v1/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(logoutResponse.status).toBe(204);

        const setCookie = String(logoutResponse.headers["set-cookie"]);
        expect(setCookie).toContain("refreshToken=");
        expect(setCookie).toMatch(
            /Max-Age=0|Expires=Thu, 01 Jan 1970 00:00:00 GMT/i
        );

        const sessionAfter = await pool.query(
            `
            SELECT revoked_at
            FROM auth_sessions
            WHERE user_id = $1
            `,
            [userId]
        );

        expect(sessionAfter.rowCount).toBe(1);
        expect(sessionAfter.rows[0].revoked_at).toBeInstanceOf(Date);
    });

    it("should reject logout without an access token", async () => {
        const response = await request(app)
            .post("/api/v1/auth/logout");

        expect(response.status).toBe(401);
    });

    it("should reject logout with an invalid access token", async () => {
        const response = await request(app)
            .post("/api/v1/auth/logout")
            .set("Authorization", "Bearer invalid-access-token");

        expect(response.status).toBe(401);
    });

    it("should prevent the logged-out refresh token from being used", async () => {
        const agent = request.agent(app);

        const loginResponse = await agent
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: TEST_PASSWORD,
            });

        expect(loginResponse.status).toBe(200);

        const accessToken = loginResponse.body.data.accessToken;

        const logoutResponse = await agent
            .post("/api/v1/auth/logout")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(logoutResponse.status).toBe(204);

        const refreshResponse = await agent
            .post("/api/v1/auth/refresh");

        expect(refreshResponse.status).toBe(401);
        expect(refreshResponse.body.error.code).toBe(
            "INVALID_REFRESH_TOKEN"
        );
    });
});
