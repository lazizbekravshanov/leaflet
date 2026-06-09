// Prisma 7 reads its config from this file (the old package.json "prisma" key is gone).
// It also no longer auto-loads .env — we do it explicitly here for CLI commands
// (migrate, studio, seed). The app itself loads env through Next.js.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Prisma 7 also moved the connection URL out of schema.prisma: the CLI
  // reads it from here, the app passes it to the PrismaPg driver adapter.
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
});
