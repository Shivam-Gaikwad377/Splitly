import request from "supertest";
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";
import bcrypt from "bcryptjs";

import app from "../../../src/app";
import { pool } from "../../../src/config/database";

const TEST_PASSWORD = "StrongPassword123!";

const EMAIL_SUCCESS = "register-success@splitly.dev";
const EMAIL_NO_PHONE = "register-no-phone@splitly.dev";
const EMAIL_EXISTING = "register-existing@splitly.dev";
const EMAIL_PHONE_HOLDER = "register-phone-holder@splitly.dev";
const EMAIL_PHONE_CONFLICT = "register-phone-conflict@splitly.dev";

const EXISTING_PHONE = "+919876543210";
const SUCCESS_PHONE = "+919876543211";

const TEST_EMAILS = [
    EMAIL_SUCCESS,
    EMAIL_NO_PHONE,
    EMAIL_EXISTING,
    EMAIL_PHONE_HOLDER,
    EMAIL_PHONE_CONFLICT,
];

async function cleanupTestUsers() {
    const result = await pool.query(
        `SELECT id FROM users WHERE email = ANY($1::text[])`,
        [TEST_EMAILS]
    );

    const userIds = result.rows.map(
        (row: { id: string }) => row.id.toString()
    );

    if (userIds.length === 0) {
        return;
    }

    await pool.query(
        `DELETE FROM auth_sessions
         WHERE user_id = ANY($1::bigint[])`,
        [userIds]
    );

    await pool.query(
        `DELETE FROM users
         WHERE id = ANY($1::bigint[])`,
        [userIds]
    );
}

async function createExistingUsers() {
    // An existing, unverified email must still be treated as a duplicate.
    await pool.query(
        `INSERT INTO users
            (name, email, phone, password_hash, email_isverified)
         VALUES ($1, $2, $3, $4, $5)`,
        [
            "Existing Unverified User",
            EMAIL_EXISTING,
            null,
            "not-used-by-this-test",
            false,
        ]
    );

    // This user owns the phone number used in the duplicate-phone test.
    await pool.query(
        `INSERT INTO users
            (name, email, phone, password_hash, email_isverified)
         VALUES ($1, $2, $3, $4, $5)`,
        [
            "Existing Phone User",
            EMAIL_PHONE_HOLDER,
            EXISTING_PHONE,
            "not-used-by-this-test",
            true,
        ]
    );
}

describe("POST /api/v1/auth/register", () => {
    beforeAll(async () => {
        await cleanupTestUsers();
        await createExistingUsers();
    });

    afterAll(async () => {
        try {
            await cleanupTestUsers();
        } finally {
            await pool.end();
        }
    });

    it("should register a user successfully", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Registration Test User",
                email: EMAIL_SUCCESS,
                password: TEST_PASSWORD,
                phone: SUCCESS_PHONE,
            });

        expect(response.status).toBe(201);

        expect(response.body).toEqual({
            success: true,
            message:
                "Account created successfully. Please verify your email.",
            data: {
                user: expect.objectContaining({
                    id: expect.any(String),
                    name: "Registration Test User",
                    email: EMAIL_SUCCESS,
                    emailVerified: false,
                    phone: SUCCESS_PHONE,
                }),
            },
        });

        const returnedUser = response.body.data.user;

        expect(returnedUser).not.toHaveProperty("password");
        expect(returnedUser).not.toHaveProperty("password_hash");
        expect(returnedUser).not.toHaveProperty("phoneVerified");

        // Verify that the password is hashed and the account is unverified.
        const result = await pool.query(
            `SELECT id, password_hash, email_isverified, phone
             FROM users
             WHERE email = $1`,
            [EMAIL_SUCCESS]
        );

        expect(result.rowCount).toBe(1);

        const databaseUser = result.rows[0];

        expect(databaseUser.password_hash).not.toBe(TEST_PASSWORD);

        expect(
            await bcrypt.compare(
                TEST_PASSWORD,
                databaseUser.password_hash
            )
        ).toBe(true);

        expect(databaseUser.email_isverified).toBe(false);
        expect(databaseUser.phone).toBe(SUCCESS_PHONE);

        // Registration must not create an authenticated session.
        const sessions = await pool.query(
            `SELECT id FROM auth_sessions WHERE user_id = $1`,
            [databaseUser.id]
        );

        expect(sessions.rowCount).toBe(0);
    });

    it("should reject an invalid request body", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Registration Test User",
                email: "not-an-email",
                password: "short",
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");

        const result = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            ["not-an-email"]
        );

        expect(result.rowCount).toBe(0);
    });

    it("should reject an existing email, even if the account is unverified", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Another User",
                email: EMAIL_EXISTING,
                password: TEST_PASSWORD,
            });

        expect(response.status).toBe(409);

        expect(response.body.error.code).toBe(
            "EMAIL_ALREADY_EXISTS"
        );

        const result = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [EMAIL_EXISTING]
        );

        expect(result.rowCount).toBe(1);
    });

    it("should reject an existing phone number", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Phone Conflict User",
                email: EMAIL_PHONE_CONFLICT,
                password: TEST_PASSWORD,
                phone: EXISTING_PHONE,
            });

        expect(response.status).toBe(409);

        expect(response.body.error.code).toBe(
            "PHONE_ALREADY_EXISTS"
        );

        const result = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [EMAIL_PHONE_CONFLICT]
        );

        expect(result.rowCount).toBe(0);
    });

    it("should register a user without a phone number", async () => {
        const response = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "No Phone User",
                email: EMAIL_NO_PHONE,
                password: TEST_PASSWORD,
            });

        expect(response.status).toBe(201);

        expect(response.body.data.user).toEqual(
            expect.objectContaining({
                name: "No Phone User",
                email: EMAIL_NO_PHONE,
                emailVerified: false,
                phone: null,
            })
        );

        expect(response.body.data.user).not.toHaveProperty(
            "phoneVerified"
        );

        const result = await pool.query(
            `SELECT phone, email_isverified
             FROM users
             WHERE email = $1`,
            [EMAIL_NO_PHONE]
        );

        expect(result.rowCount).toBe(1);
        expect(result.rows[0].phone).toBeNull();
        expect(result.rows[0].email_isverified).toBe(false);
    });
});