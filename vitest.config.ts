import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",

      include: ["src/**/*.ts"],

      exclude: [
        "src/server.ts",
        "src/db/seeds/**",
        "src/types/**",
        "src/utils/async-handler.ts",
        "src/utils/logger.ts",
      ],

      reporter: ["text", "html"],
    },
  },
});