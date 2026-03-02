import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  tableNo: z.string().max(32).nullable().optional(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
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
  const order = await prisma.order.update({
    where: { id },
    data: parsed.data,
    include: { items: { include: { product: true } } },
  });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "UPDATE",
    resource: "order",
    resourceId: id,
    details: `修改訂單 ${order.orderNo}`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(order);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const prisma = await getPrisma();
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { orderNo: true } });
  await prisma.order.delete({ where: { id } });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "DELETE",
    resource: "order",
    resourceId: id,
    details: order ? `刪除訂單 ${order.orderNo}` : "刪除訂單",
    ip: getClientIp(req.headers),
  });
  return NextResponse.json({ ok: true });
}
