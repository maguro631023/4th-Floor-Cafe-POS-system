import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const createMobileOrderSchema = z.object({
  tableNo: z.string().max(32).nullable().optional(),
  clientDate: z.string().regex(/^\d{8}$/).optional(), // YYYYMMDD 客戶端本地日期
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "至少需要一個品項"),
});

export async function POST(req: NextRequest) {
  const prisma = await getPrisma();
  const body = await req.json();
  const parsed = createMobileOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, tableNo, clientDate } = parsed.data;

  // 依 productId 查詢實際售價，避免前端竄改價格
  const ids = Array.from(new Set(items.map((i) => i.productId)));
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
  });
  const priceById = new Map(dbProducts.map((p) => [p.id, p.priceCents]));

  const missing = ids.filter((id) => !priceById.has(id));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: { message: "有品項不存在或已停用，請重新整理再試。" } },
      { status: 400 }
    );
  }

  const orderItemsData = items.map((i) => {
    const price = priceById.get(i.productId)!;
    return {
      productId: i.productId,
      quantity: i.quantity,
      unitPriceCents: price,
      subtotalCents: i.quantity * price,
    };
  });

  const totalCents = orderItemsData.reduce((sum, i) => sum + i.subtotalCents, 0);

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
      status: "PENDING",
      items: { create: orderItemsData },
    },
    include: { items: { include: { product: true } } },
  });

  await recordAudit(prisma, {
    userId: null,
    userEmail: null,
    action: "MOBILE_ORDER",
    resource: "order",
    resourceId: order.id,
    details: `手機點餐 訂單 ${order.orderNo} 桌${order.tableNo ?? "—"} $${(
      order.totalCents / 100
    ).toLocaleString()}`,
    ip: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, orderId: order.id, orderNo: order.orderNo });
}

