import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type { Mock } from "vitest";
import type { PoolClient, QueryResult } from "pg";

/**
 * Shared database mock.
 *
 * The repository tests use this mocked pool. No real database
 * connection is created by these unit tests.
 */
vi.mock("../../../src/config/database", () => ({
    pool: {
        connect: vi.fn(),
    },
}));

function createQueryResult(
    rows: unknown[] = [],
    rowCount: number | null = 0
): QueryResult {
    return {
        rows,
        rowCount,
        command: "",
        oid: 0,
        fields: [],
    };
}

/* ============================================================
   REPOSITORY UNIT TESTS
   ============================================================ */

describe("deleteUserAccount repository", () => {
    const userId = "123";

    let client: {
        query: ReturnType<typeof vi.fn>;
        release: ReturnType<typeof vi.fn>;
    };

    let deleteUserAccount: typeof import(
        "../../../src/modules/users/users.repository"
    ).deleteUserAccount;

    let mockPoolConnect: Mock<() => Promise<PoolClient>>;

    beforeEach(async () => {
        // Ensure the repository's actual implementation is loaded.
        vi.doUnmock("../../../src/modules/users/users.repository");
        vi.doUnmock("../../../src/modules/users/users.service");

        vi.resetModules();

        const { pool } = await import(
            "../../../src/config/database"
        );

        const repository = await import(
            "../../../src/modules/users/users.repository"
        );

        deleteUserAccount = repository.deleteUserAccount;

        vi.resetAllMocks();

        client = {
            query: vi.fn(),
            release: vi.fn(),
        };

        mockPoolConnect = pool.connect as unknown as Mock<
            () => Promise<PoolClient>
        >;

        mockPoolConnect.mockResolvedValue(
            client as unknown as PoolClient
        );
    });

    it("should delete the user's groups and account within a transaction", async () => {
        client.query
            .mockResolvedValueOnce(createQueryResult()) // BEGIN
            .mockResolvedValueOnce(
                createQueryResult([{ id: userId }], 1)
            ) // SELECT user
            .mockResolvedValueOnce(createQueryResult([], 1)) // DELETE groups
            .mockResolvedValueOnce(createQueryResult([], 1)) // DELETE user
            .mockResolvedValueOnce(createQueryResult()); // COMMIT

        const result = await deleteUserAccount(userId);

        expect(result).toBe(true);

        expect(mockPoolConnect).toHaveBeenCalledTimes(1);

        expect(client.query).toHaveBeenNthCalledWith(
            1,
            "BEGIN"
        );

        expect(client.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("SELECT id"),
            [userId]
        );

        expect(client.query).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining("DELETE FROM groups"),
            [userId]
        );

        expect(client.query).toHaveBeenNthCalledWith(
            4,
            expect.stringContaining("DELETE FROM users"),
            [userId]
        );

        expect(client.query).toHaveBeenNthCalledWith(
            5,
            "COMMIT"
        );

        expect(client.query).toHaveBeenCalledTimes(5);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("should return false and roll back when the user does not exist", async () => {
        client.query
            .mockResolvedValueOnce(createQueryResult()) // BEGIN
            .mockResolvedValueOnce(createQueryResult([], 0)) // SELECT user
            .mockResolvedValueOnce(createQueryResult()); // ROLLBACK

        const result = await deleteUserAccount(userId);

        expect(result).toBe(false);

        expect(client.query).toHaveBeenNthCalledWith(
            3,
            "ROLLBACK"
        );

        expect(client.query).toHaveBeenCalledTimes(3);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("should roll back and propagate an error when checking the user fails", async () => {
        const databaseError = new Error("User lookup failed");

        client.query
            .mockResolvedValueOnce(createQueryResult()) // BEGIN
            .mockRejectedValueOnce(databaseError) // SELECT user
            .mockResolvedValueOnce(createQueryResult()); // ROLLBACK

        await expect(
            deleteUserAccount(userId)
        ).rejects.toBe(databaseError);

        expect(client.query).toHaveBeenNthCalledWith(
            3,
            "ROLLBACK"
        );

        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("should roll back when deleting the user's groups fails", async () => {
        const databaseError = new Error("Group deletion failed");

        client.query
            .mockResolvedValueOnce(createQueryResult()) // BEGIN
            .mockResolvedValueOnce(
                createQueryResult([{ id: userId }], 1)
            ) // SELECT user
            .mockRejectedValueOnce(databaseError) // DELETE groups
            .mockResolvedValueOnce(createQueryResult()); // ROLLBACK

        await expect(
            deleteUserAccount(userId)
        ).rejects.toBe(databaseError);

        expect(client.query).toHaveBeenNthCalledWith(
            4,
            "ROLLBACK"
        );

        // The DELETE FROM users query must not execute.
        expect(client.query).toHaveBeenCalledTimes(4);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("should roll back when deleting the account fails", async () => {
        const databaseError = new Error("Account deletion failed");

        client.query
            .mockResolvedValueOnce(createQueryResult()) // BEGIN
            .mockResolvedValueOnce(
                createQueryResult([{ id: userId }], 1)
            ) // SELECT user
            .mockResolvedValueOnce(createQueryResult([], 1)) // DELETE groups
            .mockRejectedValueOnce(databaseError) // DELETE user
            .mockResolvedValueOnce(createQueryResult()); // ROLLBACK

        await expect(
            deleteUserAccount(userId)
        ).rejects.toBe(databaseError);

        expect(client.query).toHaveBeenNthCalledWith(
            5,
            "ROLLBACK"
        );

        expect(client.query).toHaveBeenCalledTimes(5);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("should roll back and propagate a commit error", async () => {
        const commitError = new Error("Commit failed");

        client.query
            .mockResolvedValueOnce(createQueryResult()) // BEGIN
            .mockResolvedValueOnce(
                createQueryResult([{ id: userId }], 1)
            ) // SELECT user
            .mockResolvedValueOnce(createQueryResult([], 1)) // DELETE groups
            .mockResolvedValueOnce(createQueryResult([], 1)) // DELETE user
            .mockRejectedValueOnce(commitError) // COMMIT
            .mockResolvedValueOnce(createQueryResult()); // ROLLBACK

        await expect(
            deleteUserAccount(userId)
        ).rejects.toBe(commitError);

        expect(client.query).toHaveBeenNthCalledWith(
            6,
            "ROLLBACK"
        );

        expect(client.query).toHaveBeenCalledTimes(6);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("should propagate a connection acquisition error", async () => {
        const connectionError = new Error(
            "Connection unavailable"
        );

        mockPoolConnect.mockRejectedValue(connectionError);

        await expect(
            deleteUserAccount(userId)
        ).rejects.toBe(connectionError);

        expect(mockPoolConnect).toHaveBeenCalledTimes(1);
        expect(client.query).not.toHaveBeenCalled();
        expect(client.release).not.toHaveBeenCalled();
    });
});

/* ============================================================
   SERVICE UNIT TESTS
   ============================================================ */

describe("deleteUserAccountService", () => {
    const userId = "123";

    let deleteUserAccount: typeof import(
        "../../../src/modules/users/users.repository"
    ).deleteUserAccount;

    let deleteUserAccountService: typeof import(
        "../../../src/modules/users/users.service"
    ).deleteUserAccountService;

    beforeEach(async () => {
        vi.doUnmock("../../../src/modules/users/users.repository");
        vi.doUnmock("../../../src/modules/users/users.service");

        vi.resetModules();

        // Mock only the repository dependency for these tests.
        vi.doMock(
            "../../../src/modules/users/users.repository",
            () => ({
                deleteUserAccount: vi.fn(),
            })
        );

        const repository = await import(
            "../../../src/modules/users/users.repository"
        );

        const service = await import(
            "../../../src/modules/users/users.service"
        );

        deleteUserAccount = repository.deleteUserAccount;
        deleteUserAccountService =
            service.deleteUserAccountService;

        vi.resetAllMocks();
    });

    it("should complete successfully when the account is deleted", async () => {
        vi.mocked(deleteUserAccount).mockResolvedValue(true);

        await expect(
            deleteUserAccountService(userId)
        ).resolves.toBeUndefined();

        expect(deleteUserAccount).toHaveBeenCalledTimes(1);
        expect(deleteUserAccount).toHaveBeenCalledWith(userId);
    });

    it("should throw a 404 AppError when the account does not exist", async () => {
        vi.mocked(deleteUserAccount).mockResolvedValue(false);

        await expect(
            deleteUserAccountService(userId)
        ).rejects.toMatchObject({
            name: "AppError",
            message: "User not found.",
            statusCode: 404,
            code: "USER_NOT_FOUND",
        });

        expect(deleteUserAccount).toHaveBeenCalledTimes(1);
        expect(deleteUserAccount).toHaveBeenCalledWith(userId);
    });

    it("should propagate repository errors", async () => {
        const repositoryError = new Error(
            "Database connection failed"
        );

        vi.mocked(deleteUserAccount).mockRejectedValue(
            repositoryError
        );

        await expect(
            deleteUserAccountService(userId)
        ).rejects.toBe(repositoryError);

        expect(deleteUserAccount).toHaveBeenCalledWith(userId);
    });
});

/* ============================================================
   CONTROLLER UNIT TESTS
   ============================================================ */

describe("deleteUserAccountController", () => {
    let deleteUserAccountService: typeof import(
        "../../../src/modules/users/users.service"
    ).deleteUserAccountService;

    let deleteUserAccountController: typeof import(
        "../../../src/modules/users/users.controller"
    ).deleteUserAccountController;

    let req: import("express").Request;
    let res: import("express").Response;
    let next: import("express").NextFunction;

    beforeEach(async () => {
        vi.doUnmock("../../../src/modules/users/users.repository");
        vi.doUnmock("../../../src/modules/users/users.service");

        vi.resetModules();

        // The controller depends on the service, not the repository.
        vi.doMock(
            "../../../src/modules/users/users.service",
            () => ({
                updateUserProfileService: vi.fn(),
                deleteUserAccountService: vi.fn(),
            })
        );

        const service = await import(
            "../../../src/modules/users/users.service"
        );

        const controller = await import(
            "../../../src/modules/users/users.controller"
        );

        deleteUserAccountService =
            service.deleteUserAccountService;

        deleteUserAccountController =
            controller.deleteUserAccountController;

        vi.resetAllMocks();

        req = {
            user: { userId: "123" },
            params: { userId: "999" },
            body: { userId: "999" },
        } as unknown as import("express").Request;

        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        } as unknown as import("express").Response;

        next = vi.fn() as unknown as import("express").NextFunction;
    });

    it("should delete the authenticated user's account and return 204", async () => {
        vi.mocked(deleteUserAccountService).mockResolvedValue(
            undefined
        );

        await deleteUserAccountController(req, res, next);

        expect(deleteUserAccountService).toHaveBeenCalledTimes(1);
        expect(deleteUserAccountService).toHaveBeenCalledWith("123");

        // The controller must ignore user IDs from the body and params.
        expect(deleteUserAccountService).not.toHaveBeenCalledWith("999");

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to Express error handling", async () => {
        const serviceError = new Error("User not found.");

        vi.mocked(deleteUserAccountService).mockRejectedValue(
            serviceError
        );

        await deleteUserAccountController(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(serviceError);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    });
});