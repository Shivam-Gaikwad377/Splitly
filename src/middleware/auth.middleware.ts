import type { RequestHandler } from "express";

import { hasActiveAuthSession } from "../modules/auth/auth.repository";
import { AppError } from "../utils/app-error";
import { verifyAccessToken } from "../utils/auth/jwt";

const MAX_POSTGRES_BIGINT = "9223372036854775807";

function isPostgresBigintId(value: unknown): value is string {
    if (
        typeof value !== "string" ||
        !/^[1-9]\d{0,18}$/.test(value)
    ) {
        return false;
    }

    // Compare strings so application IDs remain strings.
    return (
        value.length < 19 ||
        value <= MAX_POSTGRES_BIGINT
    );
}

function invalidAccessTokenError(): AppError {
    return new AppError(
        "Invalid or expired access token",
        401,
        "INVALID_ACCESS_TOKEN"
    );
}

export const authMiddleware: RequestHandler = async (
    req,
    _res,
    next
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(
            new AppError(
                "Authentication required",
                401,
                "UNAUTHORIZED"
            )
        );
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
        return next(invalidAccessTokenError());
    }

    let decoded: ReturnType<typeof verifyAccessToken>;

    try {
        decoded = verifyAccessToken(token);
    } catch {
        return next(invalidAccessTokenError());
    }

    const userId = decoded.sub;
    const sessionId = decoded.sid;

    if (
        !isPostgresBigintId(userId) ||
        !isPostgresBigintId(sessionId)
    ) {
        return next(invalidAccessTokenError());
    }

    // A valid JWT is insufficient if its session has expired
    // or been revoked by logout/password reset.
    const sessionIsActive = await hasActiveAuthSession(
        userId,
        sessionId
    );

    if (!sessionIsActive) {
        return next(invalidAccessTokenError());
    }

    req.user = {
        userId,
        sessionId,
    };

    return next();
};