/**
 * 啟動時檢查並建立預設資料（若資料庫為空）
 * 建立 admin 使用者、categories、products
 */
const path = require("path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require(path.join(__dirname, "../node_modules/.prisma/client/index.js"));
const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@4fcafe.com";
const ADMIN_PASSWORD = "admin123";

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
  { name: "紅茶", priceCents: 11000, categoryId: "drink" },
  { name: "奶茶", priceCents: 5000, categoryId: "drink" },
  { name: "套餐", priceCents: 20000, categoryId: "set_meal" },
  { name: "四樓套餐", priceCents: 25000, categoryId: "set_meal" },
  { name: "其他飲品", priceCents: 6000, categoryId: "other" },
];

async function main() {
  const userCount = await prisma.user.count();
  const categoryCount = await prisma.category.count();

  if (userCount === 0) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash, name: "管理員", role: "ADMIN" },
    });
    console.log("Default admin created: admin@4fcafe.com / admin123");
  }

  if (categoryCount === 0) {
    for (const c of categories) {
      await prisma.category.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name, sortOrder: c.sortOrder },
        update: { name: c.name, sortOrder: c.sortOrder },
      });
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
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[init-admin]", e.message);
  process.exit(1);
});
