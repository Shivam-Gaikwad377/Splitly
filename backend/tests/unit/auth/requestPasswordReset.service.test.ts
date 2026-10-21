
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    requestPasswordReset,
} from "../../../src/modules/auth/auth.services";

const mocks = vi.hoisted(() => ({
    // Password-reset repository functions
    findUserForPasswordReset: vi.fn(),
    savePasswordResetCode: vi.fn(),
    clearPasswordResetCode: vi.fn(),

    // Email-code utilities
    generateEmailVerificationCode: vi.fn(),
    hashEmailVerificationCode: vi.fn(),
    verifyEmailVerificationCode: vi.fn(),

    // Other repository exports imported by auth.services.ts
    findUserByIdentifier: vi.fn(),
    createAuthSession: vi.fn(),
    findAuthSessionByTokenHash: vi.fn(),
    rotateRefreshToken: vi.fn(),
    revokeAuthSession: vi.fn(),
    createUser: vi.fn(),
    findUserByEmail: vi.fn(),
    findUserByPhone: vi.fn(),
    saveEmailVerificationCode: vi.fn(),
    clearVerificationCode: vi.fn(),
    findUserForEmailVerification: vi.fn(),
    markEmailAsVerified: vi.fn(),
    findUserForPasswordResetCode: vi.fn(),
    updatePasswordAndConsumeResetCode: vi.fn(),
}));

vi.mock("../../../src/modules/auth/auth.repository", () => ({
    findUserForPasswordReset: mocks.findUserForPasswordReset,
    savePasswordResetCode: mocks.savePasswordResetCode,
    clearPasswordResetCode: mocks.clearPasswordResetCode,

    findUserByIdentifier: mocks.findUserByIdentifier,
    createAuthSession: mocks.createAuthSession,
    findAuthSessionByTokenHash: mocks.findAuthSessionByTokenHash,
    rotateRefreshToken: mocks.rotateRefreshToken,
    revokeAuthSession: mocks.revokeAuthSession,
    createUser: mocks.createUser,
    findUserByEmail: mocks.findUserByEmail,
    findUserByPhone: mocks.findUserByPhone,
    saveEmailVerificationCode: mocks.saveEmailVerificationCode,
    clearVerificationCode: mocks.clearVerificationCode,
    findUserForEmailVerification: mocks.findUserForEmailVerification,
    markEmailAsVerified: mocks.markEmailAsVerified,
    findUserForPasswordResetCode: mocks.findUserForPasswordResetCode,
    updatePasswordAndConsumeResetCode:
        mocks.updatePasswordAndConsumeResetCode,
}));

vi.mock("../../../src/utils/auth/emailVerificationCode", () => ({
    generateEmailVerificationCode:
        mocks.generateEmailVerificationCode,
    hashEmailVerificationCode:
        mocks.hashEmailVerificationCode,
    verifyEmailVerificationCode:
        mocks.verifyEmailVerificationCode,
}));

vi.mock("../../../src/config/env", () => ({
    env: {
        emailVerification: {
            secret: "test-email-verification-secret",
        },
    },
}));

const EMAIL = "user@example.com";
const CODE = "483921";
const HASH = "test-password-reset-hash";

describe("requestPasswordReset", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        vi.spyOn(console, "error").mockImplementation(() => {});

        mocks.findUserForPasswordReset.mockResolvedValue({
            id: "123",
            email_isverified: true,
        });

        mocks.generateEmailVerificationCode.mockReturnValue(CODE);
        mocks.hashEmailVerificationCode.mockReturnValue(HASH);
        mocks.savePasswordResetCode.mockResolvedValue(true);
        mocks.clearPasswordResetCode.mockResolvedValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("clears the code created by this request when email delivery fails", async () => {
        const sendError = new Error("Brevo unavailable");

        const sendEmail = vi.fn().mockRejectedValue(sendError);

        await expect(
            requestPasswordReset(EMAIL, sendEmail),
        ).resolves.toBeUndefined();

        expect(mocks.savePasswordResetCode).toHaveBeenCalledOnce();

        const [userId, savedHash, savedExpiry] =
            mocks.savePasswordResetCode.mock.calls[0];

        expect(userId).toBe("123");
        expect(savedHash).toBe(HASH);

        expect(mocks.clearPasswordResetCode).toHaveBeenCalledOnce();
        expect(mocks.clearPasswordResetCode).toHaveBeenCalledWith(
            userId,
            savedHash,
            savedExpiry,
        );
    });

    it("does not clear a code when email delivery succeeds", async () => {
        const sendEmail = vi.fn().mockResolvedValue(undefined);

        await requestPasswordReset(EMAIL, sendEmail);

        expect(sendEmail).toHaveBeenCalledWith(EMAIL, CODE);
        expect(mocks.clearPasswordResetCode).not.toHaveBeenCalled();
    });

    it("handles cleanup returning false when the saved code has changed", async () => {
        // The repository reports that the expected hash/expiry
        // no longer matches the database row.
        mocks.clearPasswordResetCode.mockResolvedValueOnce(false);

        const sendEmail = vi
            .fn()
            .mockRejectedValue(new Error("Brevo unavailable"));

        await expect(
            requestPasswordReset(EMAIL, sendEmail),
        ).resolves.toBeUndefined();

        expect(mocks.clearPasswordResetCode).toHaveBeenCalledOnce();

        const [userId, savedHash, savedExpiry] =
            mocks.savePasswordResetCode.mock.calls[0];

        // Cleanup is conditional on the exact code this request saved.
        expect(mocks.clearPasswordResetCode).toHaveBeenCalledWith(
            userId,
            savedHash,
            savedExpiry,
        );

        // No unconditional retry should clear a newer code.
        expect(mocks.clearPasswordResetCode).toHaveBeenCalledTimes(1);
    });

    it("does not throw if the cleanup query itself fails", async () => {
        mocks.clearPasswordResetCode.mockRejectedValueOnce(
            new Error("Database unavailable during cleanup"),
        );

        const sendEmail = vi
            .fn()
            .mockRejectedValue(new Error("Brevo unavailable"));

        await expect(
            requestPasswordReset(EMAIL, sendEmail),
        ).resolves.toBeUndefined();

        expect(mocks.clearPasswordResetCode).toHaveBeenCalledOnce();
        expect(console.error).toHaveBeenCalled();
    });

    it("does not generate or save a code for an unknown account", async () => {
        mocks.findUserForPasswordReset.mockResolvedValueOnce(null);

        const sendEmail = vi.fn();

        await requestPasswordReset(EMAIL, sendEmail);

        expect(mocks.generateEmailVerificationCode).not.toHaveBeenCalled();
        expect(mocks.savePasswordResetCode).not.toHaveBeenCalled();
        expect(sendEmail).not.toHaveBeenCalled();
    });
});
