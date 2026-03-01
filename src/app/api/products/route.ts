import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  priceCents: z.number().int().min(0),
  categoryId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const prisma = await getPrisma();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1" || searchParams.get("all") === "true";
  const products = await prisma.product.findMany({
    where: all ? undefined : { isActive: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: { category: true },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const prisma = await getPrisma();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const count = await prisma.product.count();
  const product = await prisma.product.create({
    data: {
      name: parsed.data.name.trim(),
      priceCents: parsed.data.priceCents,
      categoryId: parsed.data.categoryId ?? null,
      sortOrder: count,
    },
    include: { category: true },
  });
  return NextResponse.json(product);
}
