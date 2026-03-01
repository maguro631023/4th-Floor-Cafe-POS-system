import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const prisma = await getPrisma();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }
  const start = new Date(date + "T00:00:00");
  const end = new Date(date + "T23:59:59.999");

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lte: end }, status: "COMPLETED" },
    include: { items: { include: { product: true } } },
  });

  const totalSales = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const byProduct: Record<string, { name: string; quantity: number; subtotalCents: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId;
      if (!byProduct[key]) {
        byProduct[key] = { name: item.product.name, quantity: 0, subtotalCents: 0 };
      }
      byProduct[key].quantity += item.quantity;
      byProduct[key].subtotalCents += item.subtotalCents;
    }
  }

  return NextResponse.json({
    date,
    orderCount: orders.length,
    totalSalesCents: totalSales,
    byProduct: Object.entries(byProduct).map(([id, v]) => ({ productId: id, ...v })),
  });
}
