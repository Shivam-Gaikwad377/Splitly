import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app";

describe("Application routes", () => {
    it("should return a successful response from the root endpoint", async () => {
        const response = await request(app)
            .get("/");

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            success: true,
            message: "Splitly backend is running",
        });
    });

    it("should return 404 for an unknown route", async () => {
        const response = await request(app)
            .get("/this-route-does-not-exist");

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            success: false,
            error: {
                code: "ROUTE_NOT_FOUND",
                message: "Route not found",
            },
        });
    });
});