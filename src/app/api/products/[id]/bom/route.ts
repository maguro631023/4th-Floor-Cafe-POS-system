import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const putBomSchema = z.object({
  items: z.array(
    z.object({
      materialId: z.string(),
      quantityPerUnit: z.number().min(0),
    })
  ),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = await getPrisma();
  const { id } = await params;
  const bom = await prisma.productBom.findMany({
    where: { productId: id },
    include: { material: true },
  });
  return NextResponse.json(bom);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const prisma = await getPrisma();
  const { id: productId } = await params;
  const body = await req.json();
  const parsed = putBomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
  if (!product) {
    return NextResponse.json({ error: { message: "品項不存在" } }, { status: 404 });
  }

  await prisma.productBom.deleteMany({ where: { productId } });
  if (parsed.data.items.length > 0) {
    await prisma.productBom.createMany({
      data: parsed.data.items.map((i) => ({
        productId,
        materialId: i.materialId,
        quantityPerUnit: i.quantityPerUnit,
      })),
    });
  }

  const bom = await prisma.productBom.findMany({
    where: { productId },
    include: { material: true },
  });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "UPDATE",
    resource: "bom",
    resourceId: productId,
    details: `更新品項 ${product.name} BOM，共 ${bom.length} 項原料`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(bom);
}
