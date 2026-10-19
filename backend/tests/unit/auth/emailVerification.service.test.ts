
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestEmailVerification } from "../../../src/modules/auth/auth.services";

const mocks = vi.hoisted(() => ({
    findUserByEmail: vi.fn(),
    saveEmailVerificationCode: vi.fn(),
    generateEmailVerificationCode: vi.fn(),
    hashEmailVerificationCode: vi.fn(),
}));

vi.mock("../../../src/modules/auth/auth.repository", () => ({
    findUserByEmail: mocks.findUserByEmail,
    saveEmailVerificationCode: mocks.saveEmailVerificationCode,
}));

vi.mock("../../../src/utils/auth/emailVerificationCode", () => ({
    generateEmailVerificationCode: mocks.generateEmailVerificationCode,
    hashEmailVerificationCode: mocks.hashEmailVerificationCode,
}));

vi.mock("../../../src/config/env", () => ({
    env: {
        emailVerification: {
            secret: "test-email-verification-secret",
        },
    },
}));

const EMAIL = "shivam@example.com";
const CODE = "483921";
const HASH = "test-hashed-code";
const CODE_EXPIRY_MS = 10 * 60 * 1000;

describe("requestEmailVerification", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        mocks.findUserByEmail.mockResolvedValue({
            id: "123",
            email_isverified: false,
        });

        mocks.generateEmailVerificationCode.mockReturnValue(CODE);
        mocks.hashEmailVerificationCode.mockReturnValue(HASH);
        mocks.saveEmailVerificationCode.mockResolvedValue(true);
    });

    it("generates, saves, and emails a code for an eligible user", async () => {
        const sendEmail = vi.fn().mockResolvedValue(undefined);

        const before = Date.now();

        await requestEmailVerification(
            `  ${EMAIL.toUpperCase()}  `,
            sendEmail
        );

        const after = Date.now();

        expect(mocks.findUserByEmail).toHaveBeenCalledWith(EMAIL);
        
        expect(mocks.generateEmailVerificationCode).toHaveBeenCalledOnce();

        expect(mocks.hashEmailVerificationCode).toHaveBeenCalledWith(
            CODE,
            "test-email-verification-secret"
        );

        expect(mocks.saveEmailVerificationCode).toHaveBeenCalledOnce();

        const [userId, tokenHash, expiresAt] =
            mocks.saveEmailVerificationCode.mock.calls[0];

        expect(userId).toBe("123");
        expect(tokenHash).toBe(HASH);
        expect(expiresAt).toBeInstanceOf(Date);
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
            before + CODE_EXPIRY_MS
        );
        expect(expiresAt.getTime()).toBeLessThanOrEqual(
            after + CODE_EXPIRY_MS
        );

        expect(sendEmail).toHaveBeenCalledWith(EMAIL, CODE);

        expect(
            mocks.saveEmailVerificationCode.mock.invocationCallOrder[0]
        ).toBeLessThan(sendEmail.mock.invocationCallOrder[0]);
    });

    it("does not generate or send a code if the user does not exist", async () => {
        mocks.findUserByEmail.mockResolvedValueOnce(null);
        const sendEmail = vi.fn().mockResolvedValue(undefined);

        await requestEmailVerification(EMAIL, sendEmail);

        expect(mocks.generateEmailVerificationCode).not.toHaveBeenCalled();
        expect(mocks.saveEmailVerificationCode).not.toHaveBeenCalled();
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it("does not generate or send a code if the email is already verified", async () => {
        mocks.findUserByEmail.mockResolvedValueOnce({
            id: "123",
            email_isverified: true,
        });

        const sendEmail = vi.fn().mockResolvedValue(undefined);

        await requestEmailVerification(EMAIL, sendEmail);

        expect(mocks.generateEmailVerificationCode).not.toHaveBeenCalled();
        expect(mocks.saveEmailVerificationCode).not.toHaveBeenCalled();
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it("does not send an email if saving the code returns false", async () => {
        mocks.saveEmailVerificationCode.mockResolvedValueOnce(false);

        const sendEmail = vi.fn().mockResolvedValue(undefined);

        await requestEmailVerification(EMAIL, sendEmail);

        expect(mocks.saveEmailVerificationCode).toHaveBeenCalledOnce();
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it("propagates a database error without sending an email", async () => {
        const databaseError = new Error("Database connection failed");

        mocks.saveEmailVerificationCode.mockRejectedValueOnce(databaseError);

        const sendEmail = vi.fn().mockResolvedValue(undefined);

        await expect(
            requestEmailVerification(EMAIL, sendEmail)
        ).rejects.toBe(databaseError);

        expect(sendEmail).not.toHaveBeenCalled();
    });
});
