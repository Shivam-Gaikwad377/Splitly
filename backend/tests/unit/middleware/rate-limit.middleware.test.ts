
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../../../src/middleware/rate-limit.middleware";

describe("createRateLimiter", () => {
    it("allows requests up to the limit and returns 429 afterwards", async () => {
        const app = express();

        app.post(
            "/test",
            createRateLimiter({
                identifier: "test-policy",
                limit: 2,
                windowMs: 60_000,
            }),
            (_req, res) => {
                res.status(200).json({ success: true });
            },
        );

        const first = await request(app).post("/test");
        const second = await request(app).post("/test");
        const third = await request(app).post("/test");

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);

        expect(third.status).toBe(429);
        expect(third.body).toEqual({
            success: false,
            error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "Too many requests. Please try again later.",
            },
        });

        expect(third.headers["ratelimit"]).toBeDefined();
        expect(third.headers["retry-after"]).toBeDefined();
    });

    it("does not let X-Forwarded-For bypass limits when proxy trust is disabled", async () => {
        const app = express();

        app.set("trust proxy", false);

        app.post(
            "/test",
            createRateLimiter({
                identifier: "forwarded-ip-spoof-test",
                limit: 2,
                windowMs: 60_000,
            }),
            (_req, res) => {
                res.status(200).json({ success: true });
            },
        );

        const first = await request(app)
            .post("/test")
            .set("X-Forwarded-For", "203.0.113.10");

        const second = await request(app)
            .post("/test")
            .set("X-Forwarded-For", "203.0.113.11");

        const third = await request(app)
            .post("/test")
            .set("X-Forwarded-For", "203.0.113.12");

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(third.status).toBe(429);
    });

});
