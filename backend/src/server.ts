import app from "./app";
import { pool } from "./config/database";
import { env } from "./config/env";

async function startServer() {
  try {
    await pool.query("SELECT current_database(), current_user");

    console.log("PostgreSQL connected successfully");

    app.listen(env.port, () => {
      console.log(
        `Splitly backend running on http://localhost:${env.port}`,
      );
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    process.exit(1);
  }
}

startServer();