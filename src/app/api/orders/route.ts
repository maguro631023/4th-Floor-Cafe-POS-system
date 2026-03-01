import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      unitPriceCents: z.number().int().min(0),
    })
  ),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { items } = parsed.data;
  const totalCents = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.order.count({
    where: { orderNo: { startsWith: today } },
  });
  const orderNo = `${today}-${String(count + 1).padStart(3, "0")}`;

  const order = await prisma.order.create({
    data: {
      orderNo,
      totalCents,
      status: "COMPLETED",
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          subtotalCents: i.quantity * i.unitPriceCents,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });
  return NextResponse.json(order);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD
  const start = date ? new Date(date + "T00:00:00") : undefined;
  const end = date ? new Date(date + "T23:59:59.999") : undefined;

  const where = date
    ? { createdAt: { gte: start, lte: end } }
    : {};
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });
  return NextResponse.json(orders);
}
