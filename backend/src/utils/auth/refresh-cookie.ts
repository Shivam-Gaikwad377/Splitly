
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

const REFRESH_TOKEN_MAX_AGE_MS =
    30 * 24 * 60 * 60 * 1000;

function getBaseRefreshTokenCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
    };
}

export function getRefreshTokenCookieOptions() {
    return {
        ...getBaseRefreshTokenCookieOptions(),
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    };
}

export function getClearRefreshTokenCookieOptions() {
    return getBaseRefreshTokenCookieOptions();
}
