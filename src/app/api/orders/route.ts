import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { z } from "zod";

const createOrderSchema = z.object({
  tableNo: z.string().max(32).nullable().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      unitPriceCents: z.number().int().min(0),
    })
  ),
});

export async function POST(req: NextRequest) {
  const prisma = await getPrisma();
  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { items, tableNo } = parsed.data;
  const totalCents = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.order.count({
    where: { orderNo: { startsWith: today } },
  });
  const orderNo = `${today}-${String(count + 1).padStart(3, "0")}`;

  const order = await prisma.order.create({
    data: {
      orderNo,
      tableNo: tableNo?.trim() || null,
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
  const prisma = await getPrisma();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD
  const table = searchParams.get("table"); // 桌號篩選
  const orderNo = searchParams.get("orderNo"); // 訂單編號（部分比對）
  const start = date ? new Date(date + "T00:00:00") : undefined;
  const end = date ? new Date(date + "T23:59:59.999") : undefined;

  const where: Record<string, unknown> = {};
  if (date && date.match(/^\d{4}-\d{2}-\d{2}$/))
    where.createdAt = { gte: start!, lte: end! };
  if (table != null && table !== "") where.tableNo = table;
  if (orderNo != null && orderNo.trim() !== "")
    where.orderNo = { contains: orderNo.trim() };
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });
  return NextResponse.json(orders);
}
