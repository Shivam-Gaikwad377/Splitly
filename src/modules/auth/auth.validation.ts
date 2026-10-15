import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
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
export type LoginInput = z.infer<typeof loginSchema>;
const phoneSchema = z
    .string({ error: "Invalid phone number." })
    .trim()
    .max(40, "Phone number is too long.")
    .transform((value, ctx) => {
        // Require an explicit country calling code.
        if (!value.startsWith("+")) {
            ctx.addIssue({
                code: "custom",
                message: "Phone number must include a country calling code.",
            });

            return z.NEVER;
        }

        const phone = parsePhoneNumberFromString(value);

        if (!phone || !phone.isValid()) {
            ctx.addIssue({
                code: "custom",
                message: "Invalid phone number.",
            });

            return z.NEVER;
        }

        // Return the canonical E.164 representation.
        return phone.number;
    });

export const registerSchema = z.object({
    name: z
        .string({ error: "Name is required." })
        .trim()
        .min(1, "Name is required.")
        .max(100, "Name must be at most 100 characters."),

    email: z
        .string({ error: "Email is required." })
        .trim()
        .toLowerCase()
        .min(1, "Email is required.")
        .email("Invalid email address.")
        .max(254, "Email must be at most 254 characters."),

    password: z
        .string({ error: "Password is required." })
        .min(8, "Password must contain at least 8 characters."),

    phone: phoneSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;


export const requestEmailVerificationSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Enter a valid email address")
        .max(254, "Email address is too long"),
});

export const verifyEmailSchema = z.object({
    code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});


export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Enter a valid email address")
        .max(254, "Email address is too long"),
});

export const resetPasswordSchema = z.object({
    code: z
        .string()
        .regex(/^\d{6}$/, "Code must be exactly 6 digits"),

    newPassword: z
        .string()
        .min(8, "Password must contain at least 8 characters"),
});
