import type { NextFunction, Request, Response } from "express";
import { updateUserProfileService } from "./users.service";
import { ApiResponse } from "../../types/apiResponse";
import { UserProfile } from "../../types/user";

export async function updateMyProfileController(
    req: Request,
    res: Response
) {
    const user = await updateUserProfileService(
        String(req.user.userId),
        req.body
    );

    const response: ApiResponse<{ user: UserProfile }> = {
        success: true,
        message: "Profile updated successfully.",
        data: {
            user,
        },
    };

    res.status(200).json(response);
}


import { deleteUserAccountService } from "./users.service";
import { getClearRefreshTokenCookieOptions, REFRESH_TOKEN_COOKIE_NAME } from "../../utils/auth/refresh-cookie";


export async function deleteUserAccountController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = String(req.user.userId);

        // Wait for the service and its database transaction to complete.
        await deleteUserAccountService(userId);

        // Clear the browser cookie only after successful deletion.
        res.clearCookie(
            REFRESH_TOKEN_COOKIE_NAME,
            getClearRefreshTokenCookieOptions()
        );

        res.status(204).send();
    } catch (error) {
        // Failed deletion must not clear the cookie.
        next(error);
    }
}
