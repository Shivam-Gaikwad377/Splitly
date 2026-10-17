import { beforeAll } from "vitest";
import { pool } from "../../src/config/database";

beforeAll(async () => {
  const result = await pool.query<{ database: string }>(
    "SELECT current_database() AS database",
  );

  const database = result.rows[0]?.database;

  if (database !== "splitly_test") {
    throw new Error(
      `Integration tests require splitly_test; connected to "${database ?? "unknown"}".`,
    );
  }

  await pool.query("SELECT 1");
});