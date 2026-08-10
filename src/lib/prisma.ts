import { PrismaClient } from "@prisma/client";

// Connection URL: prefer the app's own DATABASE_URL, but fall back to the
// Supabase↔Vercel integration's managed pooled URL (POSTGRES_PRISMA_URL) so the
// app connects whether the connection string is set manually or provisioned by
// the integration. Passing datasourceUrl overrides the schema's env("DATABASE_URL").
const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL;

// Singleton Prisma client — avoids exhausting DB connections during dev HMR.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(databaseUrl ? { datasourceUrl: databaseUrl } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
