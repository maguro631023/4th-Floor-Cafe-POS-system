/**
 * 4樓咖啡 seed - 使用 Node 執行 (node prisma/seed.cjs)
 * 直接 require .prisma/client 的 index.js，避開 default.js 的 #main-entry-point 解析問題
 */
const path = require("path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require(path.join(__dirname, "../generated/prisma/index.js"));
// 若 DATABASE_URL 為 railway.internal，改用 DATABASE_PUBLIC_URL（build 時可能無法連私有網路）
const dbUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const categories = [
  { id: "drink", name: "飲品", sortOrder: 0 },
  { id: "light_food", name: "輕食", sortOrder: 1 },
  { id: "set_meal", name: "套餐", sortOrder: 2 },
  { id: "other", name: "其他", sortOrder: 3 },
];

const products = [
  { name: "美式第一杯", priceCents: 12000, categoryId: "drink" },
  { name: "美式", priceCents: 1500, categoryId: "drink" },
  { name: "拿鐵(小)", priceCents: 8000, categoryId: "drink" },
  { name: "拿鐵(大)", priceCents: 10000, categoryId: "drink" },
  { name: "拿鐵", priceCents: 10000, categoryId: "drink" },
  { name: "鬆餅", priceCents: 10000, categoryId: "light_food" },
  { name: "鬆餅(大)", priceCents: 10000, categoryId: "light_food" },
  { name: "鬆餅(份)", priceCents: 6000, categoryId: "light_food" },
  { name: "貝果", priceCents: 6000, categoryId: "light_food" },
  { name: "貝果(小)", priceCents: 6000, categoryId: "light_food" },
  { name: "貝果(大)", priceCents: 10000, categoryId: "light_food" },
  { name: "貝果(小)2", priceCents: 6000, categoryId: "light_food" },
  { name: "貝果(大)2", priceCents: 10000, categoryId: "light_food" },
  { name: "紅茶", priceCents: 11000, categoryId: "drink" },
  { name: "紅茶(杯)", priceCents: 9500, categoryId: "drink" },
  { name: "奶茶", priceCents: 5000, categoryId: "drink" },
  { name: "奶茶(杯)", priceCents: 3000, categoryId: "drink" },
  { name: "鮮奶(杯)", priceCents: 5500, categoryId: "drink" },
  { name: "可可", priceCents: 6000, categoryId: "drink" },
  { name: "綠茶", priceCents: 8000, categoryId: "drink" },
  { name: "綠茶(杯)", priceCents: 7600, categoryId: "drink" },
  { name: "綠茶(杯)2", priceCents: 5000, categoryId: "drink" },
  { name: "拿鐵(特)", priceCents: 4000, categoryId: "drink" },
  { name: "鬆餅(片)", priceCents: 5000, categoryId: "light_food" },
  { name: "鬆餅(1片)", priceCents: 9000, categoryId: "light_food" },
  { name: "鬆餅(2片)", priceCents: 16000, categoryId: "light_food" },
  { name: "鬆餅(4片)", priceCents: 30000, categoryId: "light_food" },
  { name: "人蔘", priceCents: 100000, categoryId: "drink" },
  { name: "大杯人蔘", priceCents: 5000, categoryId: "drink" },
  { name: "熱可可", priceCents: 5000, categoryId: "drink" },
  { name: "熱可可(杯)", priceCents: 3000, categoryId: "drink" },
  { name: "套餐", priceCents: 20000, categoryId: "set_meal" },
  { name: "四樓套餐", priceCents: 25000, categoryId: "set_meal" },
  { name: "六樓套餐", priceCents: 35000, categoryId: "set_meal" },
  { name: "套餐加點", priceCents: 13000, categoryId: "set_meal" },
  { name: "套餐加點B", priceCents: 25000, categoryId: "set_meal" },
  { name: "拿鐵4", priceCents: 10000, categoryId: "drink" },
  { name: "拿鐵8", priceCents: 18000, categoryId: "drink" },
  { name: "拿鐵4杯", priceCents: 7500, categoryId: "drink" },
  { name: "拿鐵8杯", priceCents: 15000, categoryId: "drink" },
  { name: "其他飲品", priceCents: 6000, categoryId: "other" },
  { name: "其他第一杯", priceCents: 6000, categoryId: "other" },
  { name: "杯400ml", priceCents: 54000, categoryId: "other" },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: { id: c.id, name: c.name, sortOrder: c.sortOrder },
      update: { name: c.name, sortOrder: c.sortOrder },
    });
  }
  const adminEmail = "admin@4fcafe.com";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    admin = await prisma.user.create({
      data: { email: adminEmail, passwordHash, name: "管理員", role: "ADMIN" },
    });
    console.log("Default admin created: admin@4fcafe.com / admin123");
  }

  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await prisma.product.create({
      data: { name: p.name, priceCents: p.priceCents, categoryId: p.categoryId, sortOrder: i },
    });
  }
  console.log("Seed done: categories & products.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
