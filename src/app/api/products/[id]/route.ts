import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  categoryId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
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
  const product = await prisma.product.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "UPDATE",
    resource: "product",
    resourceId: id,
    details: `修改品項 ${product.name}`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(product);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const prisma = await getPrisma();
  const { id } = await params;
  const orderItemsCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderItemsCount > 0) {
    return NextResponse.json(
      { error: { message: "此品項已有訂單紀錄，無法刪除。請改為停用。" } },
      { status: 400 }
    );
  }
  const product = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  await prisma.product.delete({ where: { id } });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "DELETE",
    resource: "product",
    resourceId: id,
    details: product ? `刪除品項 ${product.name}` : "刪除品項",
    ip: getClientIp(req.headers),
  });
  return NextResponse.json({ ok: true });
}
