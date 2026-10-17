import dotenv from "dotenv";

const envFile = process.env.NODE_ENV === "test"
  ? ".env.test"
  : ".env";

dotenv.config({ path: envFile });


function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
type RateLimitClientIpSource = "socket" | "railway";

function getRateLimitClientIpSource(): RateLimitClientIpSource {
  const source = process.env.RATE_LIMIT_CLIENT_IP_SOURCE ?? "socket";

  if (source !== "socket" && source !== "railway") {
    throw new Error(
      "RATE_LIMIT_CLIENT_IP_SOURCE must be 'socket' or 'railway'",
    );
  }

  return source;
}

const rateLimitClientIpSource = getRateLimitClientIpSource();
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  port: Number(process.env.PORT) || 5000,

  db: {
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT) || 5432,
    name: requireEnv("DB_NAME"),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
  },

  jwt: {
    secret: requireEnv("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  },


  emailVerification: {
    secret: requireEnv("EMAIL_VERIFICATION_SECRET"),
  },

  brevo: {
    apiKey: requireEnv("BREVO_API_KEY"),
    senderEmail: requireEnv("BREVO_SENDER_EMAIL"),
    senderName: requireEnv("BREVO_SENDER_NAME"),
  },
  rateLimit: {
    keySecret: requireEnv("RATE_LIMIT_KEY_SECRET"),
    clientIpSource: rateLimitClientIpSource,
  },

};