import { NextRequest, NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { recordAudit, getClientIp } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session.user) {
    const prisma = await getPrisma();
    await recordAudit(prisma, {
      userId: session.user.userId,
      userEmail: session.user.email,
      action: "LOGOUT",
      resource: "user",
      resourceId: session.user.userId,
      details: "登出",
      ip: getClientIp(req.headers),
    });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
