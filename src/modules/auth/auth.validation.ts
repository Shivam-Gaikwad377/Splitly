import { z } from "zod";

export const loginSchema = z
    .object({
        identifier: z
            .string()
            .trim()
            .min(1, "Identifier is required")
            .max(254, "Identifier is too long"),

        password: z
            .string()
            .min(1, "Password is required"),
    })
    .strict();