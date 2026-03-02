import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = await getPrisma();
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
    include: { _count: { select: { products: true } } },
  });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "UPDATE",
    resource: "category",
    resourceId: id,
    details: `修改分類 ${category.name}`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(category);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const prisma = await getPrisma();
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id }, select: { name: true } });
  await prisma.category.delete({ where: { id } });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "DELETE",
    resource: "category",
    resourceId: id,
    details: category ? `刪除分類 ${category.name}` : "刪除分類",
    ip: getClientIp(req.headers),
  });
  return NextResponse.json({ ok: true });
}
