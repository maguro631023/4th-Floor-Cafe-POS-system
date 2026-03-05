import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const createOrderSchema = z.object({
  tableNo: z.string().max(32).nullable().optional(),
  clientDate: z.string().regex(/^\d{8}$/).optional(), // YYYYMMDD 客戶端本地日期，使訂單號與顯示時間一致
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      unitPriceCents: z.number().int().min(0),
    })
  ),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  const prisma = await getPrisma();
  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { items, tableNo, clientDate } = parsed.data;
  const totalCents = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);

  const today = clientDate ?? new Date().toISOString().slice(0, 10).replace(/-/g, "");
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
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "CHECKOUT",
    resource: "order",
    resourceId: order.id,
    details: `結帳 訂單 ${order.orderNo} 桌${order.tableNo ?? "—"} $${(order.totalCents / 100).toLocaleString()}`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(order);
}

export async function GET(req: NextRequest) {
  const prisma = await getPrisma();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD
  const tz = searchParams.get("tz"); // 時區偏移（小時），如 8 表示 UTC+8，用於將使用者選擇的日期轉為正確的 UTC 範圍
  const table = searchParams.get("table"); // 桌號篩選
  const orderNo = searchParams.get("orderNo"); // 訂單編號（部分比對）

  let start: Date | undefined;
  let end: Date | undefined;
  if (date && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const tzHours = tz ? parseInt(tz, 10) : 0;
    const ms = new Date(date + "T00:00:00.000Z").getTime() - tzHours * 3600000;
    start = new Date(ms);
    end = new Date(ms + 24 * 3600000 - 1);
  }

  const where: Record<string, unknown> = {};
  if (start && end) where.createdAt = { gte: start, lte: end };
  if (table != null && table !== "") where.tableNo = table;
  if (orderNo != null && orderNo.trim() !== "")
    where.orderNo = { contains: orderNo.trim() };
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });
  if (orders.length === 0) {
    return NextResponse.json(orders);
  }

  // 從稽核日誌判斷是否為手機點餐，以及最後處理者（使用者 email）
  const orderIds = orders.map((o) => o.id);
  const logs = await prisma.auditLog.findMany({
    where: { resource: "order", resourceId: { in: orderIds } },
    orderBy: { createdAt: "asc" },
  });

  const meta = new Map<
    string,
    {
      mobileSource: boolean;
      handledBy: string | null;
    }
  >();
  for (const id of orderIds) {
    meta.set(id, { mobileSource: false, handledBy: null });
  }
  for (const log of logs) {
    const id = log.resourceId;
    if (!id) continue;
    const m = meta.get(id);
    if (!m) continue;
    if (log.action === "MOBILE_ORDER") {
      m.mobileSource = true;
    }
    if (log.userEmail) {
      m.handledBy = log.userEmail;
    }
  }

  const enriched = orders.map((o) => {
    const m = meta.get(o.id);
    return {
      ...o,
      mobileSource: m?.mobileSource ?? false,
      handledBy: m?.handledBy ?? null,
    };
  });

  return NextResponse.json(enriched);
}
