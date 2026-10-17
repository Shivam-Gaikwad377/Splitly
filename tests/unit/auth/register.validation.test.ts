import { describe, expect, it } from "vitest";
import { registerSchema } from "../../../src/modules/auth/auth.validation";

const validRegistration = {
    name: "Shivam Gaikwad",
    email: "shivam@example.com",
    password: "StrongPassword123!",
    phone: "+919876543210",
};

describe("registerSchema", () => {
    it("should accept valid registration data", () => {
        const result = registerSchema.safeParse(validRegistration);

        expect(result.success).toBe(true);
    });

    it("should trim the name and normalize the email", () => {
        const result = registerSchema.safeParse({
            ...validRegistration,
            name: "  Shivam Gaikwad  ",
            email: "  SHIVAM@EXAMPLE.COM  ",
        });

        expect(result.success).toBe(true);

        if (!result.success) return;

        expect(result.data.name).toBe("Shivam Gaikwad");
        expect(result.data.email).toBe("shivam@example.com");
    });

    it("should reject an invalid email", () => {
        const result = registerSchema.safeParse({
            ...validRegistration,
            email: "invalid-email",
        });

        expect(result.success).toBe(false);
    });

    it("should reject a missing name", () => {
        const { name: _name, ...dataWithoutName } = validRegistration;

        const result = registerSchema.safeParse(dataWithoutName);

        expect(result.success).toBe(false);
    });

    it("should reject a password shorter than 8 characters", () => {
        const result = registerSchema.safeParse({
            ...validRegistration,
            password: "Ab1!",
        });

        expect(result.success).toBe(false);
    });

    it("should allow registration when phone is omitted", () => {
        const result = registerSchema.safeParse(validRegistration);

        expect(result.success).toBe(true);
    });

    it("should accept and normalize a valid international phone number", () => {
        const result = registerSchema.safeParse({
            ...validRegistration,
            phone: "+91 98765 43210",
        });

        expect(result.success).toBe(true);

        if (!result.success) return;

        expect(result.data.phone).toBe("+919876543210");
    });

    it("should reject an invalid phone number", () => {
        const result = registerSchema.safeParse({
            ...validRegistration,
            phone: "not-a-phone-number",
        });

        expect(result.success).toBe(false);
    });

    it("should preserve the password without trimming it", () => {
        const password = "  StrongPassword123!  ";

        const result = registerSchema.safeParse({
            ...validRegistration,
            password,
        });

        expect(result.success).toBe(true);

        if (!result.success) return;

        expect(result.data.password).toBe(password);
    });
});