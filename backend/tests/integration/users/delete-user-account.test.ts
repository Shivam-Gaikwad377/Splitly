
import request from "supertest";
import bcrypt from "bcryptjs";
import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import app from "../../../src/app";
import { pool } from "../../../src/config/database";
import { REFRESH_TOKEN_COOKIE_NAME } from "../../../src/utils/auth/refresh-cookie";

const TEST_EMAIL = "delete-account-test@splitly.dev";
const OTHER_EMAIL = "delete-account-other-test@splitly.dev";
const TEST_PASSWORD = "Test@12345";
const TEST_EMAILS = [TEST_EMAIL, OTHER_EMAIL];

async function createTestUser(email: string): Promise<string> {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const result = await pool.query<{ id: string }>(
        `
        INSERT INTO users (
            name,
            email,
            phone,
            password_hash,
            email_isverified
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id::text AS id
        `,
        [
            "Account Deletion Test User",
            email,
            null,
            passwordHash,
            true,
        ]
    );

    return result.rows[0].id;
}

async function cleanupTestData(): Promise<void> {
    // Delete test-owned groups first. Their dependent expenses,
    // memberships, and expense participants follow their FK rules.
    await pool.query(
        `
        DELETE FROM groups
        WHERE created_by IN (
            SELECT id
            FROM users
            WHERE email = ANY($1::varchar[])
        )
        `,
        [TEST_EMAILS]
    );

    // Owned contacts and authentication sessions follow their FK rules.
    await pool.query(
        `
        DELETE FROM users
        WHERE email = ANY($1::varchar[])
        `,
        [TEST_EMAILS]
    );
}

function getSetCookieHeaders(
    value: string[] | string | undefined
): string[] {
    if (Array.isArray(value)) {
        return value;
    }

    return value ? [value] : [];
}

function extractRefreshToken(
    value: string[] | string | undefined
): string {
    const cookie = getSetCookieHeaders(value).find(
        (header) => header.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`)
    );

    const match = cookie?.match(
        new RegExp(`^${REFRESH_TOKEN_COOKIE_NAME}=([^;]+)`)
    );

    if (!match) {
        throw new Error("Login response did not set a refresh token cookie.");
    }

    return match[1];
}

async function login(email = TEST_EMAIL): Promise<{
    accessToken: string;
    refreshToken: string;
}> {
    const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
            identifier: email,
            password: TEST_PASSWORD,
        });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toEqual(
        expect.any(String)
    );

    return {
        accessToken: response.body.data.accessToken as string,
        refreshToken: extractRefreshToken(
            response.headers["set-cookie"]
        ),
    };
}

async function createGroupExpenseFixture(ownerId: string) {
    const contactResult = await pool.query<{ id: string }>(
        `
        INSERT INTO contacts (owner_user_id, name, phone, email)
        VALUES ($1, $2, $3, $4)
        RETURNING id::text AS id
        `,
        [ownerId, "Deletion Test Contact", null, null]
    );

    const contactId = contactResult.rows[0].id;

    const groupResult = await pool.query<{ id: string }>(
        `
        INSERT INTO groups (name, created_by)
        VALUES ($1, $2)
        RETURNING id::text AS id
        `,
        ["Deletion Test Group", ownerId]
    );

    const groupId = groupResult.rows[0].id;

    const memberResult = await pool.query<{ id: string }>(
        `
        INSERT INTO group_members (group_id, contact_id)
        VALUES ($1, $2)
        RETURNING id::text AS id
        `,
        [groupId, contactId]
    );

    const groupMemberId = memberResult.rows[0].id;

    const expenseResult = await pool.query<{ id: string }>(
        `
        INSERT INTO expenses (
            group_id,
            paid_by_group_member_id,
            description,
            amount,
            split_method
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id::text AS id
        `,
        [
            groupId,
            groupMemberId,
            "Deletion Test Expense",
            "100.00",
            "equal",
        ]
    );

    const expenseId = expenseResult.rows[0].id;

    await pool.query(
        `
        INSERT INTO expense_participant (
            expense_id,
            group_member_id,
            amount_owed
        )
        VALUES ($1, $2, $3)
        `,
        [expenseId, groupMemberId, "100.00"]
    );

    return {
        contactId,
        groupId,
        groupMemberId,
        expenseId,
    };
}

async function countRows(
    sql: string,
    values: unknown[]
): Promise<number> {
    const result = await pool.query<{ count: number }>(
        sql,
        values
    );

    return Number(result.rows[0].count);
}

describe("DELETE /api/v1/users/me", () => {
    let userId: string;

    beforeEach(async () => {
        await cleanupTestData();
        userId = await createTestUser(TEST_EMAIL);
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
        await pool.end();
    });

    it("should delete the account, clear its cookie, and invalidate all sessions", async () => {
        const fixture = await createGroupExpenseFixture(userId);
        const preservedUserId = await createTestUser(OTHER_EMAIL);

        // Two independent logins create two server-side sessions.
        const firstLogin = await login();
        const secondLogin = await login();

        expect(
            await countRows(
                `
                SELECT COUNT(*)::int AS count
                FROM auth_sessions
                WHERE user_id = $1
                `,
                [userId]
            )
        ).toBe(2);

        const response = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${firstLogin.accessToken}`)
            .set(
                "Cookie",
                `${REFRESH_TOKEN_COOKIE_NAME}=${firstLogin.refreshToken}`
            )
            // A supplied ID must not override the authenticated user.
            .send({ userId: preservedUserId });

        expect(response.status).toBe(204);
        expect(response.text).toBe("");

        // Verify the response expires the refresh-token cookie.
        const deletionCookie = getSetCookieHeaders(
            response.headers["set-cookie"]
        ).find(
            (header) =>
                header.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`)
        );

        expect(deletionCookie).toBeDefined();
        expect(deletionCookie).toMatch(
            /(?:Max-Age=0|Expires=Thu, 01 Jan 1970 00:00:00 GMT)/i
        );
        expect(deletionCookie).toMatch(/HttpOnly/i);
        expect(deletionCookie).toMatch(/SameSite=Strict/i);

        // The account has been deleted.
        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM users WHERE id = $1",
                [userId]
            )
        ).toBe(0);

        // The server has removed every session for the deleted account.
        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM auth_sessions WHERE user_id = $1",
                [userId]
            )
        ).toBe(0);

        // Groups, memberships, expenses, and participants are gone.
        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM groups WHERE id = $1",
                [fixture.groupId]
            )
        ).toBe(0);

        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM group_members WHERE id = $1",
                [fixture.groupMemberId]
            )
        ).toBe(0);

        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM expenses WHERE id = $1",
                [fixture.expenseId]
            )
        ).toBe(0);

        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM expense_participant WHERE expense_id = $1",
                [fixture.expenseId]
            )
        ).toBe(0);

        // The account's owned contact has also been removed.
        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM contacts WHERE id = $1",
                [fixture.contactId]
            )
        ).toBe(0);

        // The unrelated account survives the deletion.
        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM users WHERE id = $1",
                [preservedUserId]
            )
        ).toBe(1);

        // Both old access tokens must now fail authentication.
        for (const session of [firstLogin, secondLogin]) {
            const meResponse = await request(app)
                .get("/api/v1/auth/me")
                .set("Authorization", `Bearer ${session.accessToken}`);

            expect(meResponse.status).toBe(401);
            expect(meResponse.body.error.code).toBe(
                "INVALID_ACCESS_TOKEN"
            );
        }

        // Neither old refresh token can create a new access token.
        for (const session of [firstLogin, secondLogin]) {
            const refreshResponse = await request(app)
                .post("/api/v1/auth/refresh")
                .set(
                    "Cookie",
                    `${REFRESH_TOKEN_COOKIE_NAME}=${session.refreshToken}`
                );

            expect(refreshResponse.status).toBe(401);
            expect(refreshResponse.body.error.code).toBe(
                "INVALID_REFRESH_TOKEN"
            );
        }
    });

    it("should reject deletion without authentication and leave the account intact", async () => {
        const response = await request(app)
            .delete("/api/v1/users/me");

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe("UNAUTHORIZED");
        expect(response.headers["set-cookie"]).toBeUndefined();

        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM users WHERE id = $1",
                [userId]
            )
        ).toBe(1);
    });

    it("should reject an invalid access token without deleting the account", async () => {
        const response = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", "Bearer invalid-access-token");

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe(
            "INVALID_ACCESS_TOKEN"
        );
        expect(response.headers["set-cookie"]).toBeUndefined();

        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM users WHERE id = $1",
                [userId]
            )
        ).toBe(1);
    });

    it("should reject deletion when the authenticated session has been revoked", async () => {
        const session = await login();

        await pool.query(
            `
            UPDATE auth_sessions
            SET revoked_at = NOW()
            WHERE user_id = $1
            `,
            [userId]
        );

        const response = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${session.accessToken}`);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe(
            "INVALID_ACCESS_TOKEN"
        );
        expect(response.headers["set-cookie"]).toBeUndefined();

        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM users WHERE id = $1",
                [userId]
            )
        ).toBe(1);
    });

    it("should reject deletion when the authenticated session has expired", async () => {
        const session = await login();

        await pool.query(
            `
            UPDATE auth_sessions
            SET expires_at = NOW() - INTERVAL '1 minute'
            WHERE user_id = $1
            `,
            [userId]
        );

        const response = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${session.accessToken}`);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe(
            "INVALID_ACCESS_TOKEN"
        );
        expect(response.headers["set-cookie"]).toBeUndefined();

        expect(
            await countRows(
                "SELECT COUNT(*)::int AS count FROM users WHERE id = $1",
                [userId]
            )
        ).toBe(1);
    });
});
