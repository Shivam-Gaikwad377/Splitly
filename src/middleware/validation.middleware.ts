import type { NextFunction, RequestHandler } from "express";
import { AppError } from "../utils/app-error";
import { z } from "zod";

export const validateBody = (schema: z.ZodType): RequestHandler => {
    const middleware: RequestHandler = (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            
            throw new AppError("Invalid request body", 400, "VALIDATION_ERROR");
        }
        req.body = result.data;
        next();
    };
    return middleware;
};

export const validateRefreshTokenCookie : RequestHandler = (
    req ,
    _res ,
    next : NextFunction
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
