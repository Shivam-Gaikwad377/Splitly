import type { Request, Response } from "express";
import { login, logoutService, refreshTokenService, registerService, requestEmailVerification, verifyEmail, requestPasswordReset, resetPassword, getCurrentUser } from "./auth.services";
import z from "zod";
import { ApiResponse } from "../../types/apiResponse";
import { env } from "../../config/env"
import { sendVerificationEmail, sendPasswordResetEmail } from "../../utils/emails/brevoEmail"
import { AppError } from "../../utils/app-error";
import { UserProfile } from "../../types/user";
import {
    REFRESH_TOKEN_COOKIE_NAME,
    getRefreshTokenCookieOptions,
    getClearRefreshTokenCookieOptions,
} from "../../utils/auth/refresh-cookie";
type LoginResponse = {
    accessToken: string;
    user: UserProfile;
}
export async function loginController(
    req: Request,
    res: Response
) {
    const { identifier, password } = req.body;

    const result = await login(identifier, password);

    res.cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        result.refreshToken,
        getRefreshTokenCookieOptions()
    );
    const response: ApiResponse<LoginResponse> = {
        success: true,
        message: "Login successful",
        data: {
            accessToken: result.accessToken,
            user: result.user,
        },
    };
    res.status(200).json(response);
}

export async function refreshTokenController(
    req: Request,
    res: Response
) {
    const refreshToken = req.cookies?.refreshToken;
    const newTokens = await refreshTokenService(refreshToken);

    res.cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        newTokens.refreshToken,
        getRefreshTokenCookieOptions()
    );

    const response: ApiResponse<{ accessToken: string }> = {
        success: true,
        message: "Tokens refreshed successfully",
        data: {
            accessToken: newTokens.accessToken,
        },
    };

    res.status(200).json(response);
};

export async function logoutController(req: Request, res: Response) {
    const { sessionId, userId } = req.user;

    await logoutService(sessionId, userId);



    res.clearCookie(
        REFRESH_TOKEN_COOKIE_NAME,
        getClearRefreshTokenCookieOptions()
    );
    res.status(204).send();
}

export async function registerController(
    req: Request,
    res: Response
) {
    const { name, email, phone, password } = req.body;

    const createdUser = await registerService(
        name,
        email,
        phone ?? null,
        password
    );

    const response: ApiResponse<{
        user: UserProfile;
    }> = {
        success: true,
        message: "Account created successfully. Please verify your email.",
        data: {
            user: {
                id: String(createdUser.id),
                name: createdUser.name,
                email: createdUser.email,
                emailVerified: Boolean(createdUser.email_isverified),
                phone: createdUser.phone ?? null,
            },
        },
    };

    res.status(201).json(response);
}

export async function requestEmailVerificationController(
    req: Request,
    res: Response
) {
    const { email } = req.body;

    await requestEmailVerification(email, sendVerificationEmail);

    const response: ApiResponse<null> = {
        success: true,
        message: "If the account is eligible, a verification email will be sent.",
        data: null,
    };

    res.status(200).json(response);
}

export async function verifyEmailController(
    req: Request,
    res: Response
) {
    const emailResult = z.string().trim().email().safeParse(req.query.email);

    if (!emailResult.success) {
        throw new AppError(
            "A valid email address is required.",
            400,
            "VALIDATION_ERROR"
        );
    }
    const { code } = req.body;
    const email = emailResult.data;

    const result = await verifyEmail(email, code);

    if (!result) {
        throw new AppError(
            "Invalid email or code",
            400,
            "INVALID_EMAIL_OR_CODE"
        );
    }
    const response: ApiResponse<null> = {
        success: true,
        message: "Email verified successfully.",
        data: null
    };
    res.status(200).json(response);
}


export async function forgotPasswordController(
    req: Request,
    res: Response
) {
    const { email } = req.body;

    await requestPasswordReset(email, sendPasswordResetEmail);

    const response: ApiResponse<null> = {
        success: true,
        message:
            "If an account exists for this email, password-reset instructions will be sent.",
        data: null,
    };

    res.status(202).json(response);
}

export async function resetPasswordController(
    req: Request,
    res: Response
) {
    const emailResult = z
        .string()
        .trim()
        .toLowerCase()
        .email()
        .max(254)
        .safeParse(req.query.email);

    if (!emailResult.success) {
        throw new AppError(
            "A valid email address is required.",
            400,
            "VALIDATION_ERROR"
        );
    }

    const { code, newPassword } = req.body;

    await resetPassword(
        emailResult.data,
        code,
        newPassword
    );

    res.status(204).send();
}

export async function getCurrentUserController(
    req: Request,
    res: Response
) {
    const user = await getCurrentUser(
        String(req.user.userId)
    );

    const response: ApiResponse<{ user: UserProfile }> = {
        success: true,
        message: "Current user retrieved successfully",
        data: {
            user,
        },
    };

    res.status(200).json(response);
}




