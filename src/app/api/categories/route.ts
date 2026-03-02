import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, "代碼僅限小寫英文、數字與底線"),
  name: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
});

export async function GET() {
  const prisma = await getPrisma();
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const prisma = await getPrisma();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const existing = await prisma.category.findUnique({ where: { id: parsed.data.id } });
  if (existing) {
    return NextResponse.json(
      { error: { message: "此分類代碼已存在" } },
      { status: 400 }
    );
  }
  const count = await prisma.category.count();
  const category = await prisma.category.create({
    data: {
      id: parsed.data.id,
      name: parsed.data.name.trim(),
      sortOrder: parsed.data.sortOrder ?? count,
    },
    include: { _count: { select: { products: true } } },
  });
  await recordAudit(prisma, {
    userId: session.user?.userId,
    userEmail: session.user?.email,
    action: "CREATE",
    resource: "category",
    resourceId: category.id,
    details: `新增分類 ${category.name}`,
    ip: getClientIp(req.headers),
  });
  return NextResponse.json(category);
}
