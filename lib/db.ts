import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Prisma v7: uses the "client" engine which requires a database adapter.
// We use @prisma/adapter-pg with an explicit pg.Pool for full SSL control.

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Use a pg.Pool directly so SSL config is applied reliably.
  // Railway's public Postgres endpoint requires SSL; rejectUnauthorized:false
  // accepts self-signed certs used by managed providers.
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// Prevent multiple Prisma Client instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// Lazy proxy — createPrismaClient() is only called on first actual DB access,
// not at module import time. This allows Next.js to build without DATABASE_URL.
export const db = new Proxy({} as ReturnType<typeof createPrismaClient>, {
  get(_, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return (globalForPrisma.prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
