import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).max(16),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
});

export async function GET() {
  try {
    const prisma = await getPrisma();
    const materials = await prisma.material.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(materials);
  } catch (err) {
    console.error("[GET /api/materials]", err);
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("does not exist") ||
      message.includes("Material") ||
      message.includes("relation")
    ) {
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(
      { error: { message: "無法取得原料列表，請確認已執行資料庫更新（prisma db push）。" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const prisma = await getPrisma();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const nameTrimmed = parsed.data.name.trim();
  const existing = await prisma.material.findFirst({
    where: { name: { equals: nameTrimmed, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json(
      { error: { message: "相同原料名稱已存在，不可重複加入。" } },
      { status: 400 }
    );
  }
  const count = await prisma.material.count();
  const material = await prisma.material.create({
    data: {
      name: nameTrimmed,
      unit: parsed.data.unit.trim(),
      lowStockThreshold: parsed.data.lowStockThreshold ?? null,
      sortOrder: count,
    },
  });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "CREATE",
    resource: "material",
    resourceId: material.id,
    details: `新增原料 ${material.name} (${material.unit})`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(material);
}
