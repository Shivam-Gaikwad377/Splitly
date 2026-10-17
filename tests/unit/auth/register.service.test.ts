import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { registerService } from "../../../src/modules/auth/auth.services";

// Create mocks for the repository functions.
const repositoryMocks = vi.hoisted(() => ({
    findUserByEmail: vi.fn(),
    findUserByPhone: vi.fn(),
    createUser: vi.fn(),

    // Other exports used by auth.services.ts
    findUserByIdentifier: vi.fn(),
    createAuthSession: vi.fn(),
    findAuthSessionByTokenHash: vi.fn(),
    rotateRefreshToken: vi.fn(),
    revokeAuthSession: vi.fn(),

    hashPassword: vi.fn<
        (password: string, saltRounds: number) => Promise<string>
    >(),
}));

vi.mock("../../../src/modules/auth/auth.repository", () => ({
    ...repositoryMocks,
}));

vi.mock("bcryptjs", () => ({
    default: {
        hash: repositoryMocks.hashPassword,
    },
}));

const input = {
    name: "Shivam Gaikwad",
    email: "shivam@example.com",
    phone: "+919876543210",
    password: "StrongPassword123!",
};

const createdUser = {
    id: "123",
    name: input.name,
    email: input.email,
    phone: input.phone,
};

describe("registerService", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        repositoryMocks.findUserByEmail.mockResolvedValue(null);
        repositoryMocks.findUserByPhone.mockResolvedValue(null);
        repositoryMocks.createUser.mockResolvedValue(createdUser);

        repositoryMocks.hashPassword.mockResolvedValue("hashed-password");
    });

    it("should reject an already registered email", async () => {
        repositoryMocks.findUserByEmail.mockResolvedValue({
            id: "1",
        });

        await expect(
            registerService(
                input.name,
                input.email,
                input.phone,
                input.password
            )
        ).rejects.toMatchObject({
            statusCode: 409,
            code: "EMAIL_ALREADY_EXISTS",
        });

        expect(repositoryMocks.findUserByPhone).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(repositoryMocks.createUser).not.toHaveBeenCalled();
    });

    it("should reject an already registered phone number", async () => {
        repositoryMocks.findUserByPhone.mockResolvedValue({
            id: "2",
        });

        await expect(
            registerService(
                input.name,
                input.email,
                input.phone,
                input.password
            )
        ).rejects.toMatchObject({
            statusCode: 409,
            code: "PHONE_ALREADY_EXISTS",
        });

        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(repositoryMocks.createUser).not.toHaveBeenCalled();
    });

    it("should hash the password and create the user", async () => {
        const result = await registerService(
            input.name,
            input.email,
            input.phone,
            input.password
        );

        expect(bcrypt.hash).toHaveBeenCalledWith(input.password, 10);

        expect(repositoryMocks.createUser).toHaveBeenCalledWith(
            input.name,
            input.email,
            input.phone,
            "hashed-password"
        );

        expect(result).toEqual(createdUser);
    });

    it("should allow registration without a phone number", async () => {
        const result = await registerService(
            input.name,
            input.email,
            null,
            input.password
        );

        expect(repositoryMocks.findUserByPhone).not.toHaveBeenCalled();

        expect(repositoryMocks.createUser).toHaveBeenCalledWith(
            input.name,
            input.email,
            null,
            "hashed-password"
        );

        expect(result).toEqual(createdUser);
    });

    it("should map an email unique-constraint violation to a conflict", async () => {
        repositoryMocks.createUser.mockRejectedValue({
            code: "23505",
            constraint: "users_email_key",
        });

        await expect(
            registerService(
                input.name,
                input.email,
                input.phone,
                input.password
            )
        ).rejects.toMatchObject({
            statusCode: 409,
            code: "EMAIL_ALREADY_EXISTS",
        });
    });

    it("should map a phone unique-constraint violation to a conflict", async () => {
        repositoryMocks.createUser.mockRejectedValue({
            code: "23505",
            constraint: "users_phone_key",
        });

        await expect(
            registerService(
                input.name,
                input.email,
                input.phone,
                input.password
            )
        ).rejects.toMatchObject({
            statusCode: 409,
            code: "PHONE_ALREADY_EXISTS",
        });
    });

    it("should propagate unexpected database errors", async () => {
        const databaseError = new Error("Database connection failed");

        repositoryMocks.createUser.mockRejectedValue(databaseError);

        await expect(
            registerService(
                input.name,
                input.email,
                input.phone,
                input.password
            )
        ).rejects.toBe(databaseError);
    });
});