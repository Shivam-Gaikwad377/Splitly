import crypto from "node:crypto";

export function generateRefreshToken(): string {

    const buffer = crypto.randomBytes(32);
    const refreshToken = buffer.toString("base64url"); // Use base64url encoding for URL-safe token
    return refreshToken;
}

export function hashRefreshToken(refreshToken: string): string {
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    return hash;
}