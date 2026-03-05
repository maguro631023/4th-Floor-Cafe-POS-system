import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).max(16).optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const prisma = await getPrisma();
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const material = await prisma.material.update({
    where: { id },
    data: parsed.data,
  });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "UPDATE",
    resource: "material",
    resourceId: id,
    details: `修改原料 ${material.name}`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(material);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const prisma = await getPrisma();
  const { id } = await params;
  const material = await prisma.material.findUnique({ where: { id }, select: { name: true } });
  await prisma.material.delete({ where: { id } });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "DELETE",
    resource: "material",
    resourceId: id,
    details: material ? `刪除原料 ${material.name}` : "刪除原料",
    ip: getClientIp(req.headers),
  });
  return NextResponse.json({ ok: true });
}
