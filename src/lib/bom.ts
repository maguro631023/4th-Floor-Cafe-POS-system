import type { PrismaClient } from "generated/prisma";

/**
 * 訂單完成時依 BOM 扣減原料庫存。
 * 依訂單明細（品項 × 數量）與各品項 BOM 計算需扣減的原料量，並更新 Material.stockQuantity。
 * 允許扣減後庫存為負數（不阻擋訂單完成）。
 */
export async function deductMaterialsForOrder(prisma: PrismaClient, orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { productId: true, quantity: true } } },
  });
  if (!order || order.items.length === 0) return;

  const productIds = [...new Set(order.items.map((i) => i.productId))];
  const bomLines = await prisma.productBom.findMany({
    where: { productId: { in: productIds } },
    include: { material: true },
  });

  const deductByMaterial = new Map<string, number>();
  for (const item of order.items) {
    const lines = bomLines.filter((l) => l.productId === item.productId);
    for (const line of lines) {
      const need = item.quantity * line.quantityPerUnit;
      deductByMaterial.set(
        line.materialId,
        (deductByMaterial.get(line.materialId) ?? 0) + need
      );
    }
  }

  if (deductByMaterial.size === 0) return;

  await prisma.$transaction(
    Array.from(deductByMaterial.entries()).map(([materialId, amount]) =>
      prisma.material.update({
        where: { id: materialId },
        data: {
          stockQuantity: { decrement: Math.round(amount) },
        },
      })
    )
  );
}
