
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import app from "../../../src/app";
import { pool } from "../../../src/config/database";

type RateLimitScenario = {
  name: string;
  path: string;
  limit: number;
  expectedStatus: number;
  body: Record<string, unknown>;
};

const scenarios: RateLimitScenario[] = [
  {
    name: "login",
    path: "/api/v1/auth/login",
    limit: 10,
    expectedStatus: 400,
    body: {},
  },
  {
    name: "registration",
    path: "/api/v1/auth/register",
    limit: 5,
    expectedStatus: 400,
    body: {},
  },
  {
    name: "refresh token",
    path: "/api/v1/auth/refresh",
    limit: 30,
    expectedStatus: 401,
    body: {},
  },
  {
    name: "logout",
    path: "/api/v1/auth/logout",
    limit: 30,
    expectedStatus: 401,
    body: {},
  },
  {
    name: "request email verification",
    path: "/api/v1/auth/verify-email/request",
    limit: 3,
    expectedStatus: 400,
    body: {},
  },
  {
    name: "verify email",
    path: "/api/v1/auth/verify-email",
    limit: 10,
    expectedStatus: 400,
    body: {},
  },
  {
    name: "forgot password",
    path: "/api/v1/auth/forgot-password",
    limit: 5,
    expectedStatus: 400,
    body: {},
  },
  {
    name: "reset password",
    path: "/api/v1/auth/reset-password",
    limit: 10,
    expectedStatus: 400,
    body: {},
  },
];

const RATE_LIMIT_ERROR = {
  success: false,
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later.",
  },
};

const TEST_IP_PREFIX = "198.51.100";

async function assertAccountLimitAcrossDifferentIps({
  path,
  limit,
  body,
  expectedStatus,
}: {
  path: string;
  limit: number;
  body: Record<string, unknown>;
  expectedStatus: number;
}) {
  const previousTrustProxy = app.get("trust proxy");

  // Isolate this test's simulated proxy topology.
  app.set("trust proxy", 1);

  try {
    for (let attempt = 1; attempt <= limit; attempt += 1) {
      const response = await request(app)
        .post(path)
        .set(
          "X-Forwarded-For",
          `${TEST_IP_PREFIX}.${100 + attempt}`,
        )
        .send(body);

      expect(
        response.status,
        `${path}: request ${attempt} should reach downstream middleware`,
      ).toBe(expectedStatus);
    }

    const blockedResponse = await request(app)
      .post(path)
      .set(
        "X-Forwarded-For",
        `${TEST_IP_PREFIX}.${101 + limit}`,
      )
      .send(body);

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual(RATE_LIMIT_ERROR);
    expect(blockedResponse.headers["ratelimit"]).toBeDefined();
    expect(blockedResponse.headers["retry-after"]).toBeDefined();
  } finally {
    app.set("trust proxy", previousTrustProxy);
  }
}

describe("Authentication route rate limiting", () => {
  afterAll(async () => {
    await pool.end();
  });

  it.each(scenarios)(
    "$name enforces its per-IP limit",
    async ({ path, limit, expectedStatus, body }) => {
      for (let attempt = 1; attempt <= limit; attempt += 1) {
        const response = await request(app)
          .post(path)
          .send(body);

        expect(
          response.status,
          `${path}: request ${attempt}`,
        ).toBe(expectedStatus);
      }

      const blockedResponse = await request(app)
        .post(path)
        .send(body);

      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.body).toEqual(RATE_LIMIT_ERROR);
      expect(blockedResponse.headers["ratelimit"]).toBeDefined();
      expect(blockedResponse.headers["retry-after"]).toBeDefined();
    },
  );

  it("enforces the login account limit across different client IPs", async () => {
    await assertAccountLimitAcrossDifferentIps({
      path: "/api/v1/auth/login",
      limit: 50,
      expectedStatus: 401,
      body: {
        identifier: "rate-limit-login@splitly.dev",
        password: "DefinitelyWrongPassword123!",
      },
    });
  });

  it("enforces the email-verification request account limit across IPs", async () => {
    await assertAccountLimitAcrossDifferentIps({
      path: "/api/v1/auth/verify-email/request",
      limit: 5,
      expectedStatus: 200,
      body: {
        email: "rate-limit-verification-request@splitly.dev",
      },
    });
  });

  it("enforces the email-verification account limit across IPs", async () => {
    await assertAccountLimitAcrossDifferentIps({
      path:
        "/api/v1/auth/verify-email?email=rate-limit-verification%40splitly.dev",
      limit: 10,
      expectedStatus: 400,
      body: {
        code: "123456",
      },
    });
  });

  it("enforces the forgot-password account limit across IPs", async () => {
    await assertAccountLimitAcrossDifferentIps({
      path: "/api/v1/auth/forgot-password",
      limit: 5,
      expectedStatus: 202,
      body: {
        email: "rate-limit-forgot-password@splitly.dev",
      },
    });
  });

  it("enforces the password-reset account limit across IPs", async () => {
    await assertAccountLimitAcrossDifferentIps({
      path:
        "/api/v1/auth/reset-password?email=rate-limit-reset%40splitly.dev",
      limit: 10,
      expectedStatus: 400,
      body: {
        code: "123456",
        newPassword: "StrongPassword123!",
      },
    });
  });
});
