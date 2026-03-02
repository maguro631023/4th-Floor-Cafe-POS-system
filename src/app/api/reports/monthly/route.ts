import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const prisma = await getPrisma();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const tz = searchParams.get("tz");
  const y = year ? parseInt(year, 10) : NaN;
  const m = month ? parseInt(month, 10) : NaN;
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    return NextResponse.json(
      { error: "year and month required (e.g. year=2026&month=3)" },
      { status: 400 }
    );
  }
  const tzHours = tz ? parseInt(tz, 10) : 0;
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const ms = new Date(startDate + "T00:00:00.000Z").getTime() - tzHours * 3600000;
  const start = new Date(ms);
  const lastDay = new Date(y, m - 1, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const endMs = new Date(endDate + "T23:59:59.999Z").getTime() - tzHours * 3600000;
  const end = new Date(endMs);

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
    year: y,
    month: m,
    startDate,
    endDate,
    orderCount: orders.length,
    totalSalesCents: totalSales,
    byProduct: Object.entries(byProduct).map(([id, v]) => ({ productId: id, ...v })),
  });
}
