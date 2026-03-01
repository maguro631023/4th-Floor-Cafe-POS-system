import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

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
