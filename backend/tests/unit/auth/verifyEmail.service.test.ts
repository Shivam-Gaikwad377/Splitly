import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyEmail } from "../../../src/modules/auth/auth.services";

const mocks = vi.hoisted(() => ({
    findUserForEmailVerification: vi.fn(),
    markEmailAsVerified: vi.fn(),
    verifyEmailVerificationCode: vi.fn(),

    // Other exports imported by auth.services.ts
    findUserByIdentifier: vi.fn(),
    createAuthSession: vi.fn(),
    findAuthSessionByTokenHash: vi.fn(),
    rotateRefreshToken: vi.fn(),
    revokeAuthSession: vi.fn(),
    createUser: vi.fn(),
    findUserByEmail: vi.fn(),
    findUserByPhone: vi.fn(),
    saveEmailVerificationCode: vi.fn(),
    generateEmailVerificationCode: vi.fn(),
    hashEmailVerificationCode: vi.fn(),
}));

vi.mock("../../../src/modules/auth/auth.repository", () => ({
    findUserForEmailVerification: mocks.findUserForEmailVerification,
    markEmailAsVerified: mocks.markEmailAsVerified,
    findUserByIdentifier: mocks.findUserByIdentifier,
    createAuthSession: mocks.createAuthSession,
    findAuthSessionByTokenHash: mocks.findAuthSessionByTokenHash,
    rotateRefreshToken: mocks.rotateRefreshToken,
    revokeAuthSession: mocks.revokeAuthSession,
    createUser: mocks.createUser,
    findUserByEmail: mocks.findUserByEmail,
    findUserByPhone: mocks.findUserByPhone,
    saveEmailVerificationCode: mocks.saveEmailVerificationCode,
}));

vi.mock("../../../src/utils/auth/emailVerificationCode", () => ({
    generateEmailVerificationCode: mocks.generateEmailVerificationCode,
    hashEmailVerificationCode: mocks.hashEmailVerificationCode,
    verifyEmailVerificationCode: mocks.verifyEmailVerificationCode,
}));

vi.mock("../../../src/config/env", () => ({
    env: {
        emailVerification: {
            secret: "unit-test-secret",
        },
    },
}));

const EMAIL = "user@example.com";
const CODE = "483921";
const STORED_HASH = "stored-test-hash";

function makeUser(overrides = {}) {
    return {
        id: "123",
        email_isverified: false,
        email_verification_token_hash: STORED_HASH,
        email_verification_token_expiresat: new Date(Date.now() + 60_000),
        ...overrides,
    };
}

describe("verifyEmail", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        mocks.findUserForEmailVerification.mockResolvedValue(makeUser());
        mocks.verifyEmailVerificationCode.mockReturnValue(true);
        mocks.markEmailAsVerified.mockResolvedValue(true);
    });

    it("verifies a valid code and normalizes the email", async () => {
        await expect(
            verifyEmail("  USER@EXAMPLE.COM ", CODE),
        ).resolves.toBe(true);

        expect(mocks.findUserForEmailVerification)
            .toHaveBeenCalledWith(EMAIL);

        expect(mocks.verifyEmailVerificationCode).toHaveBeenCalledWith(
            CODE,
            STORED_HASH,
            "unit-test-secret",
        );

        expect(mocks.markEmailAsVerified).toHaveBeenCalledWith(
            "123",
            STORED_HASH,
        );
    });

    it("rejects when the user does not exist", async () => {
        mocks.findUserForEmailVerification.mockResolvedValue(null);

        await expect(verifyEmail(EMAIL, CODE)).rejects.toMatchObject({
            statusCode: 400,
            code: "INVALID_EMAIL_OR_CODE",
        });

        expect(mocks.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it("rejects an already-verified email", async () => {
        mocks.findUserForEmailVerification.mockResolvedValue(
            makeUser({ email_isverified: true }),
        );

        await expect(verifyEmail(EMAIL, CODE)).rejects.toMatchObject({
            statusCode: 409,
            code: "EMAIL_ALREADY_VERIFIED",
        });

        expect(mocks.verifyEmailVerificationCode).not.toHaveBeenCalled();
    });

    it("rejects an incorrect code", async () => {
        mocks.verifyEmailVerificationCode.mockReturnValue(false);

        await expect(verifyEmail(EMAIL, "111111")).rejects.toMatchObject({
            statusCode: 400,
            code: "INVALID_EMAIL_OR_CODE",
        });

        expect(mocks.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it("rejects an expired code", async () => {
        mocks.findUserForEmailVerification.mockResolvedValue(
            makeUser({
                email_verification_token_expiresat:
                    new Date(Date.now() - 60_000),
            }),
        );

        await expect(verifyEmail(EMAIL, CODE)).rejects.toMatchObject({
            statusCode: 400,
            code: "INVALID_EMAIL_OR_CODE",
        });

        expect(mocks.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it("returns false when the repository update does not succeed", async () => {
        mocks.markEmailAsVerified.mockResolvedValue(false);

        await expect(verifyEmail(EMAIL, CODE)).resolves.toBe(false);
    });
});