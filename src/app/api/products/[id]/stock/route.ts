import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { z } from "zod";

const adjustSchema = z.object({
  delta: z.number().int(), // 正數入庫、負數出庫
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = await getPrisma();
  const { id } = await params;
  const body = await req.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: { message: "品項不存在" } }, { status: 404 });
  }
  const current = product.stockQuantity ?? 0;
  const nextStock = Math.max(0, current + parsed.data.delta);
  const updated = await prisma.product.update({
    where: { id },
    data: { stockQuantity: nextStock },
    include: { category: true },
  });
  return NextResponse.json(updated);
}
