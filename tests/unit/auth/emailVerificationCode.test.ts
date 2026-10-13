
import { describe, expect, it } from "vitest";
import { generateEmailVerificationCode, hashEmailVerificationCode, verifyEmailVerificationCode } from "../../../src/utils/auth/emailVerifcationCode";

const SECRET = "test-email-verification-secret";
const CODE = "483921";

describe("generateEmailVerificationCode", () => {
    it("should generate a six-digit numeric code", () => {
        const code = generateEmailVerificationCode();

        expect(code).toMatch(/^\d{6}$/);
        expect(Number(code)).toBeGreaterThanOrEqual(100000);
        expect(Number(code)).toBeLessThanOrEqual(999999);
    });
});

describe("hashEmailVerificationCode", () => {
    it("should generate a hexadecimal HMAC hash", () => {
        const hash = hashEmailVerificationCode(CODE, SECRET);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should return the same hash for the same code and secret", () => {
        const firstHash = hashEmailVerificationCode(CODE, SECRET);
        const secondHash = hashEmailVerificationCode(CODE, SECRET);

        expect(firstHash).toBe(secondHash);
    });

    it("should return different hashes for different secrets", () => {
        const firstHash = hashEmailVerificationCode(CODE, SECRET);
        const secondHash = hashEmailVerificationCode(
            CODE,
            "another-test-secret"
        );

        expect(firstHash).not.toBe(secondHash);
    });

    it("should throw when the code or secret is missing", () => {
        expect(() => hashEmailVerificationCode("", SECRET))
            .toThrow("Code and secret must be provided for hashing.");

        expect(() => hashEmailVerificationCode(CODE, ""))
            .toThrow("Code and secret must be provided for hashing.");
    });
});

describe("verifyEmailVerificationCode", () => {
    const hashedCode = hashEmailVerificationCode(CODE, SECRET);

    it("should return true for the correct code", () => {
        expect(
            verifyEmailVerificationCode(CODE, hashedCode, SECRET)
        ).toBe(true);
    });

    it("should return false for an incorrect code", () => {
        expect(
            verifyEmailVerificationCode("123456", hashedCode, SECRET)
        ).toBe(false);
    });

    it("should return false when the wrong secret is used", () => {
        expect(
            verifyEmailVerificationCode(
                CODE,
                hashedCode,
                "another-test-secret"
            )
        ).toBe(false);
    });

    it("should return false for a malformed stored hash", () => {
        expect(
            verifyEmailVerificationCode(CODE, "invalid-hash", SECRET)
        ).toBe(false);
    });

    it("should throw when the code, hash, or secret is missing", () => {
        expect(() => verifyEmailVerificationCode("", hashedCode, SECRET))
            .toThrow(
                "Code, hashed code, and secret must be provided for verification."
            );

        expect(() => verifyEmailVerificationCode(CODE, "", SECRET))
            .toThrow(
                "Code, hashed code, and secret must be provided for verification."
            );

        expect(() => verifyEmailVerificationCode(CODE, hashedCode, ""))
            .toThrow(
                "Code, hashed code, and secret must be provided for verification."
            );
    });
});
