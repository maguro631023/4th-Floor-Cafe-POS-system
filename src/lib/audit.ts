import type { PrismaClient } from "@prisma/client";

export type AuditPayload = {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: string | null;
  ip?: string | null;
};

export async function recordAudit(prisma: PrismaClient, payload: AuditPayload) {
  await prisma.auditLog.create({
    data: {
      userId: payload.userId ?? undefined,
      userEmail: payload.userEmail ?? undefined,
      action: payload.action,
      resource: payload.resource,
      resourceId: payload.resourceId ?? undefined,
      details: payload.details ?? undefined,
      ip: payload.ip ?? undefined,
    },
  });
}

export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  );
}
