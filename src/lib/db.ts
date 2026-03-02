import type { PrismaClient } from "@prisma/client";
import path from "path";
import { createRequire } from "module";
import { existsSync } from "fs";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const cwd = process.cwd();
  const require = createRequire(
    typeof import.meta !== "undefined" && import.meta.url ? import.meta.url : path.resolve(cwd, "package.json")
  );
  // 優先使用 generated/prisma（自訂 output），否則 fallback 到 node_modules
  const generatedPath = path.join(cwd, "generated", "prisma", "index.js");
  const defaultPath = path.join(cwd, "node_modules", ".prisma", "client", "index.js");
  const clientPath = existsSync(generatedPath) ? generatedPath : defaultPath;
  const { PrismaClient: P } = require(clientPath);
  const client = new P() as PrismaClient;
  globalForPrisma.prisma = client;
  return client;
}
