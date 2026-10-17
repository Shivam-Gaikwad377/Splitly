
import {
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import { pool } from "../../../src/config/database";
import {
    clearPasswordResetCode,
} from "../../../src/modules/auth/auth.repository";

const TEST_EMAIL = "password-reset-cleanup@splitly.dev";
const TEST_NAME = "Password Reset Cleanup Test";

const OLD_HASH = "old-reset-code-hash";
const NEW_HASH = "new-reset-code-hash";

let userId: string;
let newExpiresAt: Date;

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

describe("clearPasswordResetCode", () => {
    beforeEach(async () => {
        await cleanupTestData();

        newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
            VALUES ($1, $2, NULL, $3, TRUE, $4, $5)
            RETURNING id`,
            [
                TEST_NAME,
                TEST_EMAIL,
                "test-password-hash",
                NEW_HASH,
                newExpiresAt,
            ],
        );

        userId = String(result.rows[0].id);
    });

    afterAll(async () => {
        await cleanupTestData();
        await pool.end();
    });

    it("does not clear a newer code when an older request fails", async () => {
        const oldExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const cleared = await clearPasswordResetCode(
            userId,
            OLD_HASH,
            oldExpiresAt,
        );

        expect(cleared).toBe(false);

        const result = await pool.query(
            `SELECT
                password_reset_token_hash,
                password_reset_token_expires_at
             FROM users
             WHERE id = $1`,
            [userId],
        );

        expect(result.rows[0].password_reset_token_hash).toBe(NEW_HASH);

        expect(
            new Date(
                result.rows[0].password_reset_token_expires_at,
            ).getTime(),
        ).toBe(newExpiresAt.getTime());
    });

    it("clears the code when the stored hash and expiry match", async () => {
        const cleared = await clearPasswordResetCode(
            userId,
            NEW_HASH,
            newExpiresAt,
        );

        expect(cleared).toBe(true);

        const result = await pool.query(
            `SELECT
                password_reset_token_hash,
                password_reset_token_expires_at
             FROM users
             WHERE id = $1`,
            [userId],
        );

        expect(result.rows[0].password_reset_token_hash).toBeNull();
        expect(result.rows[0].password_reset_token_expires_at).toBeNull();
    });
});
