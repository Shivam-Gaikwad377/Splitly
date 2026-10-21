
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  createAccountRateLimiter,
} from "../../../src/middleware/rate-limit.middleware";

function createTestApp(
  options: {
    limit: number;
    skipSuccessfulRequests?: boolean;
  },
) {
  const app = express();

  app.use(express.json());

  app.post(
    "/login",
    createAccountRateLimiter({
      identifier: `test-account-${options.limit}-${String(options.skipSuccessfulRequests)}`,
      limit: options.limit,
      windowMs: 60_000,
      source: "body",
      field: "identifier",
      kind: "login",
      skipSuccessfulRequests:
        options.skipSuccessfulRequests,
    }),
    (req, res) => {
      if (req.body.password === "wrong") {
        res.status(401).json({ success: false });
        return;
      }

      res.status(200).json({ success: true });
    },
  );

  return app;
}

describe("Account-level rate limiting", () => {
  it("blocks repeated requests for the same account", async () => {
    const app = createTestApp({ limit: 1 });

    const first = await request(app)
      .post("/login")
      .send({ identifier: "alice@example.com" });

    const repeated = await request(app)
      .post("/login")
      .send({ identifier: "alice@example.com" });

    expect(first.status).toBe(200);
    expect(repeated.status).toBe(429);
    expect(repeated.body.error.code).toBe(
      "RATE_LIMIT_EXCEEDED",
    );
  });

  it("uses separate counters for different accounts", async () => {
    const app = createTestApp({ limit: 1 });

    const alice = await request(app)
      .post("/login")
      .send({ identifier: "alice@example.com" });

    const bob = await request(app)
      .post("/login")
      .send({ identifier: "bob@example.com" });

    expect(alice.status).toBe(200);
    expect(bob.status).toBe(200);
  });

  it("counts failed attempts but does not retain successful ones", async () => {
    const app = createTestApp({
      limit: 1,
      skipSuccessfulRequests: true,
    });

    const successfulFirst = await request(app)
      .post("/login")
      .send({
        identifier: "alice@example.com",
        password: "correct",
      });

    const successfulSecond = await request(app)
      .post("/login")
      .send({
        identifier: "alice@example.com",
        password: "correct",
      });

    expect(successfulFirst.status).toBe(200);
    expect(successfulSecond.status).toBe(200);

    const failedFirst = await request(app)
      .post("/login")
      .send({
        identifier: "bob@example.com",
        password: "wrong",
      });

    const failedSecond = await request(app)
      .post("/login")
      .send({
        identifier: "bob@example.com",
        password: "wrong",
      });

    expect(failedFirst.status).toBe(401);
    expect(failedSecond.status).toBe(429);
  });

  it("falls back to IP for missing account identifiers", async () => {
    const app = createTestApp({ limit: 1 });

    const first = await request(app)
      .post("/login")
      .send({});

    const second = await request(app)
      .post("/login")
      .send({});

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });
});
