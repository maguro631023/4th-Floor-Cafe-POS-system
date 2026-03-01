import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession, hashPassword, canAccessUserManagement } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(), // 有傳才更新密碼
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (!canAccessUserManagement(session.user.role)) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    );
  }
  const prisma = await getPrisma();
  const data: { name?: string; role?: string; isActive?: boolean; passwordHash?: string } = {};
  if (parsed.data.name != null) data.name = parsed.data.name.trim();
  if (parsed.data.role != null) data.role = parsed.data.role;
  if (parsed.data.isActive != null) data.isActive = parsed.data.isActive;
  if (parsed.data.password != null) data.passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}
