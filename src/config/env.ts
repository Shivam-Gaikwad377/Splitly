import dotenv from "dotenv";
dotenv.config();


function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
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
};