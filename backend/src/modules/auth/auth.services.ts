import bcrypt from 'bcryptjs';
import {
    findUserByIdentifier,
    createAuthSession,
    findAuthSessionByTokenHash,
    rotateRefreshToken,
    revokeAuthSession,
    createUser,
    findUserByEmail,
    findUserByPhone,
    saveEmailVerificationCode,
    clearVerificationCode,
    findUserForEmailVerification,
    markEmailAsVerified,
    findUserForPasswordReset,
    findUserForPasswordResetCode,
    savePasswordResetCode,
    updatePasswordAndConsumeResetCode,
    clearPasswordResetCode,
    findUserById
} from './auth.repository';
import { generateRefreshToken, hashRefreshToken } from '../../utils/auth/refreshToken';
import { signAccessToken } from '../../utils/auth/jwt';
import { AppError } from '../../utils/app-error';
import {
    generateEmailVerificationCode,
    hashEmailVerificationCode,
    verifyEmailVerificationCode
} from '../../utils/auth/emailVerificationCode'
import { env } from '../../config/env';
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { UserProfile } from '../../types/user';
function isPostgresUniqueViolation(
    error: unknown
): error is { code: "23505"; constraint?: string } {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
    );
}
function normalizeLoginIdentifier(identifier: string): string {
    const value = identifier.trim();

    // Email addresses are stored in lowercase.
    if (value.includes("@")) {
        return value.toLowerCase();
    }

    // Phone numbers are stored in E.164 format.
    const phone = parsePhoneNumberFromString(value);

    if (phone?.isValid()) {
        return phone.number;
    }

    // Invalid identifiers still fail through normal credential checks.
    return value;
}

export async function login(identifier: string, password: string) {
    const user = await findUserByIdentifier(normalizeLoginIdentifier(identifier));

    if (!user) {
        throw new AppError(
            "Invalid credentials",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!isPasswordValid) {
        throw new AppError(
            "Invalid credentials",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    if (!user.email_isverified) {
        throw new AppError(
            "Email not verified",
            403,
            "EMAIL_NOT_VERIFIED"
        );
    }


    // Generate a new refresh token
    const refreshToken = generateRefreshToken();

    // Hash the refresh token before storing it in the database
    const hashedRefreshToken = hashRefreshToken(refreshToken);

    // Create a new auth session in the database
    const authSession = await createAuthSession(String(user.id), hashedRefreshToken);

    // Generate an access token
    const accessToken = signAccessToken(user.id, authSession.id);
    const loggedInUser : UserProfile = {
        id: user.id.toString() as string,
        email: user.email as string,
        name: user.name as string,
        phone: user.phone as string | null,
        emailVerified: user.email_isverified as boolean

    }
    // return the access token and refresh token
    return {
        accessToken,
        refreshToken,
        user: loggedInUser

    }
}

export async function refreshTokenService(oldRefreshToken: string) {
    const hashedOldRefreshToken = hashRefreshToken(oldRefreshToken);

    const authSession = await findAuthSessionByTokenHash(
        hashedOldRefreshToken
    );

    if (!authSession) {
        throw new AppError(
            "Invalid refresh token",
            401,
            "INVALID_REFRESH_TOKEN"
        );
    }



    if (new Date(authSession.expires_at).getTime() <= Date.now() || authSession.revoked_at !== null) {
        throw new AppError(
            "Invalid refresh token",
            401,
            "INVALID_REFRESH_TOKEN"
        );
    }

    const newRefreshToken = generateRefreshToken();
    const hashedNewRefreshToken = hashRefreshToken(newRefreshToken);

    const updateSuccess = await rotateRefreshToken(
        String(authSession.id),
        hashedNewRefreshToken,
        hashedOldRefreshToken
    );

    if (!updateSuccess) {
        throw new AppError(
            "Invalid refresh token",
            401,
            "INVALID_REFRESH_TOKEN"
        );
    }

    const accessToken = signAccessToken(
        String(authSession.user_id),
        String(authSession.id)
    );

    return {
        accessToken,
        refreshToken: newRefreshToken,
    };
}

export async function logoutService(sessionId: string, userId: string): Promise<boolean> {
    const revokeSuccess = await revokeAuthSession(sessionId, userId);
    if (!revokeSuccess) {
        throw new AppError(
            "Unauthorized request",
            401,
            "UNAUTHORIZED_REQUEST"
        );
    }
    return revokeSuccess;
}

export async function registerService(name: string, email: string, phone: string | null, password: string) {
    // Check if the email is already registered
    const existingUserByEmail = await findUserByEmail(email);
    if (existingUserByEmail) {

        throw new AppError(
            "An account with this email already exists.",
            409,
            "EMAIL_ALREADY_EXISTS"
        );

    }

    // Check if the phone number is already registered (if provided)
    if (phone) {
        const existingUserByPhone = await findUserByPhone(phone);
        if (existingUserByPhone) {
            throw new AppError(
                "An account with this phone number already exists.",
                409,
                "PHONE_ALREADY_EXISTS"
            );
        }
    }

    // Hash the password before storing it in the database
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the new user in the database
    try {
        return await createUser(name, email, phone, passwordHash);
    } catch (error: unknown) {
        if (isPostgresUniqueViolation(error)) {
            switch (error.constraint) {
                case "users_email_key":
                    throw new AppError(
                        "Email is already registered",
                        409,
                        "EMAIL_ALREADY_EXISTS"
                    );

                case "users_phone_key":
                    throw new AppError(
                        "Phone number is already registered",
                        409,
                        "PHONE_ALREADY_EXISTS"
                    );
            }
        }

        throw error;
    }
}




const CODE_EXPIRY_MS = 10 * 60 * 1000;

type EmailSender = (
    email: string,
    code: string
) => Promise<void>;

export async function requestEmailVerification(
    email: string,
    sendEmail: EmailSender
): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await findUserByEmail(normalizedEmail);

    // Keep the public response generic for ineligible accounts.
    if (!user || user.email_isverified) {
        return;
    }

    const code = generateEmailVerificationCode();

    const tokenHash = hashEmailVerificationCode(
        code,
        env.emailVerification.secret
    );

    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);


    const saved = await saveEmailVerificationCode(
        String(user.id),
        tokenHash,
        expiresAt
    );

    if (!saved) {
        return;
    }

    try {
        await sendEmail(normalizedEmail, code);
    } catch (sendError: unknown) {
        // Clear only the verification code created by this request.
        try {
            await clearVerificationCode(
                String(user.id),
                tokenHash,
                expiresAt
            );
        } catch (cleanupError: unknown) {
            // A cleanup failure must not change the public response.
            console.error(
                "Failed to clear email-verification code after email delivery failure.",
                cleanupError
            );
        }

        console.error(
            "Failed to send email-verification email.",
            sendError
        );
    }


}

export async function verifyEmail(
    email: string,
    code: string
) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserForEmailVerification(normalizedEmail);

    if (!user) {
        throw new AppError(
            "Invalid email or code",
            400,
            "INVALID_EMAIL_OR_CODE"
        );
    }
    if (!user.email_verification_token_hash || !user.email_verification_token_expiresat) {
        throw new AppError(
            "Invalid email or code",
            400,
            "INVALID_EMAIL_OR_CODE"
        );
    }
    if (user.email_isverified) {
        throw new AppError(
            "Email is already verified",
            409,
            "EMAIL_ALREADY_VERIFIED"
        );
    }

    const isCodeValid = verifyEmailVerificationCode(
        code,
        user.email_verification_token_hash,
        env.emailVerification.secret
    ) && new Date(user.email_verification_token_expiresat).getTime() > Date.now();

    if (!isCodeValid) {
        throw new AppError(
            "Invalid email or code",
            400,
            "INVALID_EMAIL_OR_CODE"
        );
    }

    const markedAsVerified = await markEmailAsVerified(
        String(user.id),
        user.email_verification_token_hash
    );

    return markedAsVerified;

}

type PasswordResetEmailSender = (
    email: string,
    code: string
) => Promise<void>;

const PASSWORD_RESET_CODE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Requests a password-reset code.
 *
 * Returns normally for unknown or unverified accounts so the
 * API can always return the same generic response.
 */
export async function requestPasswordReset(
    email: string,
    sendEmail: PasswordResetEmailSender
): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await findUserForPasswordReset(normalizedEmail);

    // Do not reveal whether an account exists.
    if (!user || !user.email_isverified) {
        return;
    }

    const code = generateEmailVerificationCode();

    const tokenHash = hashEmailVerificationCode(
        code,
        env.emailVerification.secret
    );

    const expiresAt = new Date(
        Date.now() + PASSWORD_RESET_CODE_EXPIRY_MS
    );

    const saved = await savePasswordResetCode(
        String(user.id),
        tokenHash,
        expiresAt
    );

    if (!saved) {
        return;
    }


    try {
        await sendEmail(normalizedEmail, code);
    } catch (sendError: unknown) {
        // Clear only the code created by this request.
        try {
            await clearPasswordResetCode(
                String(user.id),
                tokenHash,
                expiresAt
            );
        } catch (cleanupError: unknown) {
            // Cleanup failure must not change the public response.
            console.error(
                "Failed to clear password-reset code after email delivery failure.",
                cleanupError
            );
        }

        console.error(
            "Failed to send password-reset email.",
            sendError
        );
    }

}

/**
 * Validates the reset code and changes the password.
 */
export async function resetPassword(
    email: string,
    code: string,
    newPassword: string
): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await findUserForPasswordResetCode(
        normalizedEmail
    );

    if (
        !user ||
        !user.password_reset_token_hash ||
        !user.password_reset_token_expires_at
    ) {
        throw new AppError(
            "Invalid or expired reset code.",
            400,
            "INVALID_RESET_TOKEN"
        );
    }

    const isCodeValid = verifyEmailVerificationCode(
        code,
        user.password_reset_token_hash,
        env.emailVerification.secret
    );

    const isCodeUnexpired =
        new Date(
            user.password_reset_token_expires_at
        ).getTime() > Date.now();

    if (!isCodeValid || !isCodeUnexpired) {
        throw new AppError(
            "Invalid or expired reset code.",
            400,
            "INVALID_RESET_TOKEN"
        );
    }

    // Never store the new password in plaintext.
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // The repository must conditionally consume the exact code
    // validated above and update the password atomically.
    const updated = await updatePasswordAndConsumeResetCode(
        String(user.id),
        user.password_reset_token_hash,
        newPasswordHash
    );

    if (!updated) {
        // The code might have expired, been replaced, or
        // already been consumed by another request.
        throw new AppError(
            "Invalid or expired reset code.",
            400,
            "INVALID_RESET_TOKEN"
        );
    }
}

export async function getCurrentUser(userId: string): Promise<UserProfile> {
    const user = await findUserById(userId);

    if (!user) {
        throw new AppError(
            "User not found",
            404,
            "USER_NOT_FOUND"
        );
    }

    return {
        id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        emailVerified: Boolean(user.email_isverified),
    };
}



