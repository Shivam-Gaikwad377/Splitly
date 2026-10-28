import type { Request, Response } from "express";
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