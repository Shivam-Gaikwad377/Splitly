import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import app from "../../../src/app";
import { pool } from "../../../src/config/database";

const TEST_EMAIL = "refresh-test@splitly.dev";
const TEST_PASSWORD = "Test@12345";
const TEST_NAME = "Refresh Test User";

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

async function cleanupSessions() {
    await pool.query(
        `
        DELETE FROM auth_sessions
        WHERE user_id = (
            SELECT id FROM users WHERE email = $1
        )
        `,
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

describe("POST /api/v1/auth/refresh", () => {
    beforeAll(async () => {
        await createTestUser();
    });

    beforeEach(async () => {
        await cleanupSessions();
    });

    afterAll(async () => {
        await cleanupSessions();

        await pool.query(
            `DELETE FROM users WHERE email = $1`,
            [TEST_EMAIL]
        );

        await pool.end();
    });

    it("should refresh successfully", async () => {
        const agent = request.agent(app);

        const loginResponse = await agent
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: TEST_PASSWORD,
            });

        expect(loginResponse.status).toBe(200);

        const refreshResponse = await agent
            .post("/api/v1/auth/refresh");

        expect(refreshResponse.status).toBe(200);

        expect(refreshResponse.body).toEqual(
            expect.objectContaining({
                success: true,
                message: "Tokens refreshed successfully",
                data: expect.objectContaining({
                    accessToken: expect.any(String),
                }),
            })
        );

        expect(refreshResponse.body.data.refreshToken)
            .toBeUndefined();

        expect(
            String(refreshResponse.headers["set-cookie"])
        ).toContain("refreshToken=");
    });

    it("should reject a request without a refresh token", async () => {
        const response = await request(app)
            .post("/api/v1/auth/refresh");

        expect(response.status).toBe(401);

        expect(response.body).toEqual({
            success: false,
            error: {
                code: "INVALID_REFRESH_TOKEN",
                message: "Refresh token not provided",
            },
        });
    });

    it("should reject a fake refresh token", async () => {
        const response = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", "refreshToken=fake-token");

        expect(response.status).toBe(401);

        expect(response.body.error.code).toBe(
            "INVALID_REFRESH_TOKEN"
        );
    });

    it("should reject an expired session", async () => {
        const agent = request.agent(app);

        await agent
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: TEST_PASSWORD,
            });

        const userId = await getUserId();

        await pool.query(
            `
            UPDATE auth_sessions
            SET expires_at = NOW() - INTERVAL '1 minute'
            WHERE user_id = $1
            `,
            [userId]
        );

        const response = await agent
            .post("/api/v1/auth/refresh");

        expect(response.status).toBe(401);

        expect(response.body.error.code).toBe(
            "INVALID_REFRESH_TOKEN"
        );
    });

    it("should reject a revoked session", async () => {
        const agent = request.agent(app);

        await agent
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: TEST_PASSWORD,
            });

        const userId = await getUserId();

        await pool.query(
            `
            UPDATE auth_sessions
            SET revoked_at = NOW()
            WHERE user_id = $1
            `,
            [userId]
        );

        const response = await agent
            .post("/api/v1/auth/refresh");

        expect(response.status).toBe(401);

        expect(response.body.error.code).toBe(
            "INVALID_REFRESH_TOKEN"
        );
    });

    it("should rotate the refresh token", async () => {
        const agent = request.agent(app);

        const loginResponse = await agent
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: TEST_PASSWORD,
            });

        expect(loginResponse.status).toBe(200);

        const firstRefresh = await agent
            .post("/api/v1/auth/refresh");

        expect(firstRefresh.status).toBe(200);

        expect(
            String(firstRefresh.headers["set-cookie"])
        ).toContain("refreshToken=");

        const secondRefresh = await agent
            .post("/api/v1/auth/refresh");

        expect(secondRefresh.status).toBe(200);

        expect(
            String(secondRefresh.headers["set-cookie"])
        ).toContain("refreshToken=");

        expect(firstRefresh.status).toBe(200);
        expect(firstRefresh.body.data.accessToken).toEqual(
            expect.any(String)
        );

        expect(secondRefresh.status).toBe(200);
        expect(secondRefresh.body.data.accessToken).toEqual(
            expect.any(String)
        );
    });

    it("should keep the same auth session during rotation", async () => {
        const agent = request.agent(app);

        await agent
            .post("/api/v1/auth/login")
            .send({
                identifier: TEST_EMAIL,
                password: TEST_PASSWORD,
            });

        const before = await pool.query(
            `
            SELECT id, token_hash
            FROM auth_sessions
            WHERE user_id = (
                SELECT id FROM users WHERE email = $1
            )
            `,
            [TEST_EMAIL]
        );

        expect(before.rowCount).toBe(1);

        const sessionIdBefore = before.rows[0].id;
        const tokenHashBefore = before.rows[0].token_hash;

        await agent
            .post("/api/v1/auth/refresh");

        const after = await pool.query(
            `
            SELECT id, token_hash
            FROM auth_sessions
            WHERE user_id = (
                SELECT id FROM users WHERE email = $1
            )
            `,
            [TEST_EMAIL]
        );

        expect(after.rowCount).toBe(1);
        expect(after.rows[0].id).toBe(sessionIdBefore);
        expect(after.rows[0].token_hash).not.toBe(
            tokenHashBefore
        );
    });
});