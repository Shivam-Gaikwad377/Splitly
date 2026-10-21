
import { Router } from "express";

import {
    loginController,
    logoutController,
    refreshTokenController,
    registerController,
    requestEmailVerificationController,
    verifyEmailController,
    forgotPasswordController,
    resetPasswordController,
    getCurrentUserController,

} from "./auth.controller";

import {
    validateBody,
    validateRefreshTokenCookie,
} from "../../middleware/validation.middleware";
import { authMiddleware } from "../../middleware/auth.middleware";

import {
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    requestEmailVerificationSchema,
    resetPasswordSchema,
    verifyEmailSchema,

} from "./auth.validation";

import {
    authRateLimiter,
    loginRateLimiter,
    registerRateLimiter,
    refreshRateLimiter,
    logoutRateLimiter,
    requestEmailVerificationRateLimiter,
    verifyEmailRateLimiter,
    forgotPasswordRateLimiter,
    resetPasswordRateLimiter,
    loginAccountRateLimiter,
    requestEmailVerificationAccountRateLimiter,
    verifyEmailAccountRateLimiter,
    forgotPasswordAccountRateLimiter,
    resetPasswordAccountRateLimiter,
    rateLimitClientIpGuard,

} from "../../middleware/rate-limit.middleware";

const router = Router();

// General protection for every authentication endpoint.

router.use(rateLimitClientIpGuard);
router.use(authRateLimiter);

// Login: per-IP limit, account limit, then validation.
router.post(
    "/login",
    loginRateLimiter,
    loginAccountRateLimiter,
    validateBody(loginSchema),
    loginController,
);

// Refresh and logout use per-IP protection.
router.post(
    "/refresh",
    refreshRateLimiter,
    validateRefreshTokenCookie,
    refreshTokenController,
);

router.post(
    "/logout",
    logoutRateLimiter,
    authMiddleware,
    logoutController,
);

// Registration uses per-IP protection.
router.post(
    "/register",
    registerRateLimiter,
    validateBody(registerSchema),
    registerController,
);

// Email verification request: per-IP and per-account protection.
router.post(
    "/verify-email/request",
    requestEmailVerificationRateLimiter,
    requestEmailVerificationAccountRateLimiter,
    validateBody(requestEmailVerificationSchema),
    requestEmailVerificationController,
);

// Verification keys on the email query parameter.
router.post(
    "/verify-email",
    verifyEmailRateLimiter,
    verifyEmailAccountRateLimiter,
    validateBody(verifyEmailSchema),
    verifyEmailController,
);

// Forgot password counts every request, including generic responses.
router.post(
    "/forgot-password",
    forgotPasswordRateLimiter,
    forgotPasswordAccountRateLimiter,
    validateBody(forgotPasswordSchema),
    forgotPasswordController,
);

// Reset password keys on the email query parameter.
router.post(
    "/reset-password",
    resetPasswordRateLimiter,
    resetPasswordAccountRateLimiter,
    validateBody(resetPasswordSchema),
    resetPasswordController,
);

router.get(
    "/me",
    authMiddleware,
    getCurrentUserController,
);

export default router;
