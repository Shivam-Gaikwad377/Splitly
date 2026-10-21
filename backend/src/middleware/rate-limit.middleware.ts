import { createHmac } from "node:crypto";
import {
    ipKeyGenerator,
    rateLimit,
} from "express-rate-limit";
import type {
    Request,
    RequestHandler,
} from "express";
import { env } from "../config/env";
import { isIP } from "node:net";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const RATE_LIMIT_ERROR = {
    success: false,
    error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
    },
} as const;

type RateLimitPolicy = {
    identifier: string;
    limit: number;
    windowMs?: number;
};
function resolveRateLimitClientIp(
    req: Request,
): string | undefined {
    const candidate =
        env.rateLimit.clientIpSource === "railway"
            ? req.get("x-real-ip")
            : req.ip;

    if (typeof candidate !== "string") {
        return undefined;
    }

    const ip = candidate.trim();

    return isIP(ip) !== 0 ? ip : undefined;
}

function createIpRateLimitKey(
    req: Request,
    identifier: string,
): string {
    const clientIp =
        resolveRateLimitClientIp(req) ??
        (req.socket.remoteAddress &&
            isIP(req.socket.remoteAddress) !== 0
            ? req.socket.remoteAddress
            : undefined);

    if (!clientIp) {
        return `${identifier}:ip:unresolved`;
    }

    return `${identifier}:ip:${ipKeyGenerator(clientIp)}`;
}
export function createRateLimiter({
    identifier,
    limit,
    windowMs = FIFTEEN_MINUTES_MS,
}: RateLimitPolicy): RequestHandler {
    return rateLimit({
        windowMs,
        limit,
        identifier,
        standardHeaders: "draft-8",
        legacyHeaders: false,

        handler: (_req, res) => {
            res.status(429).json(RATE_LIMIT_ERROR);
        },
        keyGenerator: (req) =>
            createIpRateLimitKey(req, identifier),
    });
}

export const authRateLimiter = createRateLimiter({
    identifier: "auth-general",
    limit: 300,
});

export const loginRateLimiter = createRateLimiter({
    identifier: "auth-login",
    limit: 10,
});

export const registerRateLimiter = createRateLimiter({
    identifier: "auth-register",
    limit: 5,
});

export const refreshRateLimiter = createRateLimiter({
    identifier: "auth-refresh",
    limit: 30,
});

export const logoutRateLimiter = createRateLimiter({
    identifier: "auth-logout",
    limit: 30,
});

export const requestEmailVerificationRateLimiter = createRateLimiter({
    identifier: "auth-email-verification-request",
    limit: 3,
});

export const verifyEmailRateLimiter = createRateLimiter({
    identifier: "auth-email-verification",
    limit: 10,
});

export const forgotPasswordRateLimiter = createRateLimiter({
    identifier: "auth-forgot-password",
    limit: 5,
});

export const resetPasswordRateLimiter = createRateLimiter({
    identifier: "auth-reset-password",
    limit: 10,
});


type AccountIdentifierSource = "body" | "query";
type AccountIdentifierKind = "email" | "login";

type AccountRateLimitPolicy = RateLimitPolicy & {
    source: AccountIdentifierSource;
    field: string;
    kind: AccountIdentifierKind;
    skipSuccessfulRequests?: boolean;
};

const MAX_ACCOUNT_IDENTIFIER_LENGTH = 254;

function getRawAccountIdentifier(
    req: Request,
    source: AccountIdentifierSource,
    field: string,
): unknown {
    const container: unknown =
        source === "body" ? req.body : req.query;

    if (
        typeof container !== "object" ||
        container === null
    ) {
        return undefined;
    }

    return (container as Record<string, unknown>)[field];
}

function normalizeAccountIdentifier(
    raw: unknown,
    kind: AccountIdentifierKind,
): string | undefined {
    if (typeof raw !== "string") {
        return undefined;
    }

    const value = raw.trim().toLowerCase();

    if (
        value.length === 0 ||
        value.length > MAX_ACCOUNT_IDENTIFIER_LENGTH
    ) {
        return undefined;
    }

    if (kind === "email") {
        // Invalid or missing identifiers fall back to IP.
        if (!value.includes("@") || /\s/.test(value)) {
            return undefined;
        }

        return `email:${value}`;
    }

    // Login supports email or phone.
    if (value.includes("@")) {
        if (/\s/.test(value)) {
            return undefined;
        }

        return `email:${value}`;
    }

    // Normalize common phone formatting differences.
    if (!/^[+\d().\-\s]+$/.test(value)) {
        return undefined;
    }

    const digits = value.replace(/\D/g, "");

    if (digits.length < 7 || digits.length > 15) {
        return undefined;
    }

    return `phone:${digits}`;
}

export function createAccountRateLimiter({
    identifier,
    limit,
    windowMs = FIFTEEN_MINUTES_MS,
    source,
    field,
    kind,
    skipSuccessfulRequests = false,
}: AccountRateLimitPolicy): RequestHandler {
    return rateLimit({
        windowMs,
        limit,
        identifier,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skipSuccessfulRequests,

        keyGenerator: (req) => {
            const rawIdentifier = getRawAccountIdentifier(
                req,
                source,
                field,
            );

            const normalized = normalizeAccountIdentifier(
                rawIdentifier,
                kind,
            );

            if (!normalized) {
                return createIpRateLimitKey(req, identifier);
            }

            const digest = createHmac(
                "sha256",
                env.rateLimit.keySecret,
            )
                .update(normalized, "utf8")
                .digest("hex");

            return `${identifier}:account:${digest}`;
        },

        handler: (_req, res) => {
            res.status(429).json(RATE_LIMIT_ERROR);
        },
    });
}


export const loginAccountRateLimiter =
    createAccountRateLimiter({
        identifier: "auth-login-account",
        limit: 50,
        source: "body",
        field: "identifier",
        kind: "login",
        skipSuccessfulRequests: true,
    });

export const requestEmailVerificationAccountRateLimiter =
    createAccountRateLimiter({
        identifier: "auth-email-verification-request-account",
        limit: 5,
        source: "body",
        field: "email",
        kind: "email",
    });

export const verifyEmailAccountRateLimiter =
    createAccountRateLimiter({
        identifier: "auth-email-verification-account",
        limit: 10,
        source: "query",
        field: "email",
        kind: "email",
        skipSuccessfulRequests: true,
    });

export const forgotPasswordAccountRateLimiter =
    createAccountRateLimiter({
        identifier: "auth-forgot-password-account",
        limit: 5,
        source: "body",
        field: "email",
        kind: "email",
    });

export const resetPasswordAccountRateLimiter =
    createAccountRateLimiter({
        identifier: "auth-reset-password-account",
        limit: 10,
        source: "query",
        field: "email",
        kind: "email",
        skipSuccessfulRequests: true,
    });

export const rateLimitClientIpGuard: RequestHandler = (
    req,
    res,
    next,
) => {
    if (env.rateLimit.clientIpSource !== "railway") {
        next();
        return;
    }

    if (!resolveRateLimitClientIp(req)) {
        res.status(503).json({
            success: false,
            error: {
                code: "CLIENT_IP_UNAVAILABLE",
                message: "Client IP could not be verified.",
            },
        });
        return;
    }

    next();
};

