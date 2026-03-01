import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
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
  return NextResponse.json(product);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = await getPrisma();
  const { id } = await params;
  const orderItemsCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderItemsCount > 0) {
    return NextResponse.json(
      { error: { message: "此品項已有訂單紀錄，無法刪除。請改為停用。" } },
      { status: 400 }
    );
  }
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
