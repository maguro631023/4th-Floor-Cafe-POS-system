import type { PrismaClient } from "@prisma/client";
import path from "path";
import { createRequire } from "module";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  // 直接載入 .prisma/client/index.js，避開 default.js 的 #main-entry-point（Prisma 6 + Next 解析問題）
  const require = createRequire(import.meta.url);
  const clientPath = path.join(process.cwd(), "node_modules", ".prisma", "client", "index.js");
  const { PrismaClient: P } = require(clientPath);
  const client = new P() as PrismaClient;
  globalForPrisma.prisma = client;
  return client;
}
