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
  const prisma = await getPrisma();
  const materials = await prisma.material.findMany({
    orderBy: { sortOrder: "asc", name: "asc" },
  });
  return NextResponse.json(materials);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const prisma = await getPrisma();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const count = await prisma.material.count();
  const material = await prisma.material.create({
    data: {
      name: parsed.data.name.trim(),
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
