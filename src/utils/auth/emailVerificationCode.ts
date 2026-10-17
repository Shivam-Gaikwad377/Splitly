import crypto from "node:crypto";

export function generateEmailVerificationCode(): string {
    const code = crypto.randomInt(100000, 1_000_000);
    return code.toString();
}

export function hashEmailVerificationCode(
    code: string,
    secret: string
): string {
    if (!code || !secret) {
        throw new Error("Code and secret must be provided for hashing.");
    }
    return crypto
        .createHmac("sha256", secret)
        .update(code)
        .digest("hex");
}

export function verifyEmailVerificationCode(
    code: string,
    hashedCode: string,
    secret: string
): boolean {
    if (!code || !hashedCode || !secret) {
        throw new Error("Code, hashed code, and secret must be provided for verification.");
    }
    const hash = Buffer.from(
        hashEmailVerificationCode(code, secret),
        "hex"
    );

    const storedHash = Buffer.from(hashedCode, "hex");

    if (hash.length !== storedHash.length) {
        return false;
    }

    return crypto.timingSafeEqual(hash, storedHash);
}