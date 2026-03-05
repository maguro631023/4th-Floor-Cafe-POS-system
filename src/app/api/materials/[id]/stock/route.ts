import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const adjustSchema = z.object({
  delta: z.number().int(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const prisma = await getPrisma();
  const { id } = await params;
  const body = await req.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) {
    return NextResponse.json({ error: { message: "原料不存在" } }, { status: 404 });
  }
  const nextStock = material.stockQuantity + parsed.data.delta;
  const updated = await prisma.material.update({
    where: { id },
    data: { stockQuantity: nextStock },
  });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "STOCK_ADJUST",
    resource: "material",
    resourceId: id,
    details: `${material.name} 庫存 ${material.stockQuantity} → ${nextStock} (${parsed.data.delta >= 0 ? "+" : ""}${parsed.data.delta})`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(updated);
}
