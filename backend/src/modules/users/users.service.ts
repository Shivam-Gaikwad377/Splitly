import { deleteUserAccount, updateUserProfile } from "./users.repository";
import { AppError } from "../../utils/app-error";

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

export async function updateUserProfileService(
    userId: string,
    updates: {
        name?: string;
        phone?: string | null;
    }
) {
    if (updates.name === undefined && updates.phone === undefined) {
        throw new AppError(
            "Invalid request data.",
            400,
            "VALIDATION_ERROR"
        );
    }

    try {
        const user = await updateUserProfile(userId, updates);

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
            emailVerified: Boolean(user.email_isverified),
            phone: user.phone ?? null,
        };
    } catch (error: unknown) {
        if (
            isPostgresUniqueViolation(error) &&
            error.constraint === "users_phone_key"
        ) {
            throw new AppError(
                "This phone number is already associated with an account.",
                409,
                "PHONE_ALREADY_IN_USE"
            );
        }

        throw error;
    }
}

export async function deleteUserAccountService(
    userId: string
): Promise<void> {
    const deletedUserId = await deleteUserAccount(userId);

    if (!deletedUserId) {
        throw new AppError(
            "User not found.",
            404,
            "USER_NOT_FOUND"
        );
    }
}