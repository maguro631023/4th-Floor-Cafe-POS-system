import { PrismaClient } from "generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const dbUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  const client = new PrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);
  globalForPrisma.prisma = client;
  return client;
}
