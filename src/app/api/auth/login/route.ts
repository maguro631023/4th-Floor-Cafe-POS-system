import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { setSession, verifyPassword } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "請輸入帳號與密碼" }, { status: 400 });
  }
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }
  await setSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await recordAudit(prisma, {
    userId: user.id,
    userEmail: user.email,
    action: "LOGIN",
    resource: "user",
    resourceId: user.id,
    details: "登入成功",
    ip: getClientIp(req.headers),
  });
  return NextResponse.json({ ok: true, name: user.name });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "登入失敗，請稍後再試" }, { status: 500 });
  }
}
