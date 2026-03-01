import type { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const { PrismaClient: P } = await import("@prisma/client");
  const client = new P();
  globalForPrisma.prisma = client;
  return client;
}
