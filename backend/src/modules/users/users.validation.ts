import { phoneSchema } from "../auth/auth.validation";
import { z } from "zod";




export const updateProfileSchema = z
    .object({
        name: z
            .string({ error: "Name must be a string." })
            .trim()
            .min(1, "Name cannot be empty.")
            .max(100, "Name must be at most 100 characters.")
            .optional(),

        phone: phoneSchema.nullable().optional(),
    })
    .strict()
    .refine(
        (data) =>
            data.name !== undefined ||
            data.phone !== undefined,
        {
            message: "Provide at least one profile field to update.",
        },
    );

export type UpdateProfileInput = z.infer<
    typeof updateProfileSchema
>;