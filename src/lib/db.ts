import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// In dev, Next.js hot-reloads modules on every edit. A fresh PrismaClient per
// reload would each open its own connection pool and exhaust Postgres
// (default max_connections = 100). Stashing the client on globalThis — which
// survives hot reloads — keeps exactly one pool per process.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Prisma 7 talks to Postgres through a driver adapter (here: node-postgres)
  // instead of the old bundled Rust engine — the pool below IS a pg.Pool.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
