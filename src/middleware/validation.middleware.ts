import type { NextFunction, RequestHandler } from "express";
import { AppError } from "../utils/app-error";
import { z } from "zod";

export const validateBody = (schema: z.ZodType): RequestHandler => {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const fields: Record<string, string> = {};

            for (const issue of result.error.issues) {
                const field = issue.path[0];

                if (typeof field === "string" && !(field in fields)) {
                    fields[field] = issue.message;
                }
            }

            throw new AppError(
                "Invalid request data.",
                400,
                "VALIDATION_ERROR",
                fields,
            );
        }

        req.body = result.data;
        next();
    };
};

export const validateRefreshTokenCookie: RequestHandler = (
    req,
    _res,
    next: NextFunction
) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        throw new AppError(
            "Refresh token not provided",
            401,
            "INVALID_REFRESH_TOKEN"
        );
    }

    next();
}
