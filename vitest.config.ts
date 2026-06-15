import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Node environment (we test repositories/services/lib, not React components),
// and the `@/` alias resolved to ./src so tests import the same way app code
// does. Integration tests talk to a real Postgres via DATABASE_URL — set it to
// a THROWAWAY test database, never a real one.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Integration tests share one Postgres; run files serially so they don't
    // race on the same rows. Within a file, tests are isolated by unique ids.
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
