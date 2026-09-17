import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// SQLite serialises writers; WAL + a busy timeout stops Prisma's P1008
// "database failed to respond" errors under concurrent dashboard/sync calls.
if (process.env.DATABASE_URL?.startsWith("file:")) {
  void prisma
    .$queryRawUnsafe("PRAGMA journal_mode=WAL;")
    .then(() => prisma.$queryRawUnsafe("PRAGMA busy_timeout=10000;"))
    .catch(() => undefined);
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
