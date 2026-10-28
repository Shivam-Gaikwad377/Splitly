
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/modules/users/users.repository", () => ({
    deleteUserAccount: vi.fn(),
}));

import { deleteUserAccount } from "../../../src/modules/users/users.repository";
import { deleteUserAccountService } from "../../../src/modules/users/users.service";
import { AppError } from "../../../src/utils/app-error";

describe("deleteUserAccountService", () => {
    const userId = "123";

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should delete the account when the user exists", async () => {
        vi.mocked(deleteUserAccount).mockResolvedValue(true);

        await expect(
            deleteUserAccountService(userId)
        ).resolves.toBeUndefined();

        expect(deleteUserAccount).toHaveBeenCalledTimes(1);
        expect(deleteUserAccount).toHaveBeenCalledWith(userId);
    });

    it("should throw a 404 AppError when the user does not exist", async () => {
        vi.mocked(deleteUserAccount).mockResolvedValue(false);

        let caughtError: unknown;

        try {
            await deleteUserAccountService(userId);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(AppError);
        expect(caughtError).toMatchObject({
            message: "User not found.",
        });
    });

    it("should propagate repository errors", async () => {
        const repositoryError = new Error(
            "Database connection failed"
        );

        vi.mocked(deleteUserAccount).mockRejectedValue(repositoryError);

        await expect(
            deleteUserAccountService(userId)
        ).rejects.toBe(repositoryError);
    });
});


import type { Request, Response, NextFunction } from "express";


vi.mock("../../../src/modules/users/users.service", () => ({
    deleteUserAccountService: vi.fn(),
}));


import { deleteUserAccountController } from "../../../src/modules/users/users.controller";

describe("deleteUserAccountController", () => {
    let req: Request;
    let res: Response;
    let next: NextFunction;

    beforeEach(() => {
        vi.resetAllMocks();

        req = {
            user: { userId: "123" },
            params: { userId: "999" },
            body: { userId: "999" },
        } as unknown as Request;

        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        } as unknown as Response;

        next = vi.fn() as unknown as NextFunction;
    });

    it("should delete the authenticated user's account and return 204", async () => {
        vi.mocked(deleteUserAccountService).mockResolvedValue(undefined);

        await deleteUserAccountController(req, res, next);

        expect(deleteUserAccountService).toHaveBeenCalledTimes(1);
        expect(deleteUserAccountService).toHaveBeenCalledWith("123");

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to Express error handling", async () => {
        const serviceError = new Error("User not found.");

        vi.mocked(deleteUserAccountService).mockRejectedValue(serviceError);

        await deleteUserAccountController(req, res, next);

        expect(next).toHaveBeenCalledWith(serviceError);
        expect(res.status).not.toHaveBeenCalled();
    });
});
