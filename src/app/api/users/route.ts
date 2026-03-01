import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession, hashPassword, canAccessUserManagement } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "密碼至少 6 碼"),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

export async function GET() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (!canAccessUserManagement(session.user.role)) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }
  const prisma = await getPrisma();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (!canAccessUserManagement(session.user.role)) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    );
  }
  const prisma = await getPrisma();
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json({ error: "此 Email 已存在" }, { status: 400 });
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      name: parsed.data.name.trim(),
      role: parsed.data.role,
    },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}
