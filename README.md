# 4樓咖啡 POS 系統

新北景觀咖啡廳 **4樓咖啡** 的收銀與營收系統，依既有營收明細 Excel 品項與價格設計。

## 技術棧

- **Next.js 15** (App Router)
- **Prisma** (Schema + PostgreSQL)
- **PostgreSQL**（本地 / Railway）
- **Railway** 部署

## 功能

- **收銀頁** `/`：依分類顯示品項、加入購物車、數量加減、結帳（寫入訂單）
- **營收報表** `/reports`：選擇日期，顯示當日訂單數、總營收、各品項數量與小計（對應 Excel 日報格式）

## 本地開發

### 1. 環境變數

複製 `.env.example` 為 `.env`，填上 PostgreSQL 連線與 Session 密鑰：

```bash
cp .env.example .env
# 編輯 .env：
# - DATABASE_URL（PostgreSQL 連線）
# - SESSION_SECRET（至少 32 字元，用於登入 session 加密，正式環境請自訂）
```

### 2. 安裝與資料庫

```bash
npm install
npx prisma db push
npm run db:seed
```

### 3. 啟動

```bash
npm run dev
```

瀏覽 [http://localhost:3000](http://localhost:3000)。未登入會導向 `/login`。

**預設管理員**（執行 `npm run db:seed` 後建立）：  
帳號 `admin@4fcafe.com` / 密碼 `admin123`。請於首次登入後至「使用者管理」修改密碼或新增帳號。

## 部署到 Railway

1. 在 [Railway](https://railway.app) 建立新專案。
2. 新增 **PostgreSQL** 服務，Railway 會自動產生 `DATABASE_URL`。
3. 新增 **Web Service**，連到本專案 Git 倉庫（或上傳程式碼）。
4. 在 Web Service 的 **Variables** 加入：
   - `DATABASE_URL`：從 PostgreSQL 服務複製（Railway 通常會自動注入）。
   - `SESSION_SECRET`：至少 32 字元的隨機字串（用於登入 session 加密）。
5. **Build**：`npm install && npx prisma generate && npm run build`
6. **Start**：`npx prisma db push && npm run start`  
   或分開：部署後在 Railway 的 Shell 手動執行一次 `npx prisma db push` 與 `npm run db:seed`。

### 建議 Railway 設定

- **Build Command**（必填）: `npm install && npx prisma generate && npm run build`  
  （必須含 `npm install`，build 時才會安裝 tailwindcss；若只填 `npx prisma generate && npm run build` 會出現 Cannot find module 'tailwindcss'）
- **Start Command**: `npm run start`
- **Root Directory**: 專案根目錄  
- 若仍失敗：到 Settings → 清除 **Build Cache** 後再 Redeploy

首次上線後在 Railway 的 PostgreSQL 執行一次：

```bash
npx prisma db push
npm run db:seed
```

（或在專案裡加一個「部署後執行 migrate + seed」的 script。）

## 使用者與權限

- **登入**：所有頁面（除 `/login`）需登入後才能存取。
- **角色**：**管理員**（ADMIN）可進入「使用者管理」、**店長**（MANAGER）與**櫃台**（STAFF）僅能使用收銀、訂單查詢、品項/分類/庫存/報表。
- **預設帳號**：seed 會建立 `admin@4fcafe.com` / `admin123`，請上線後修改密碼。

## 資料結構（Prisma Schema）

- **User**：帳號（email）、密碼雜湊、姓名、角色（ADMIN/MANAGER/STAFF）、是否啟用
- **Category**：分類（飲品、輕食、套餐、其他）
- **Product**：品項名稱、售價（priceCents）、所屬分類、庫存與低庫存門檻
- **Order**：訂單編號、桌號、總額、狀態、建立時間
- **OrderItem**：訂單明細（品項、數量、單價、小計）

價格以「分」儲存（例如 120 元 → `priceCents: 12000`），避免浮點誤差。

## 品項來源

`prisma/seed.ts` 內品名與售價對應您提供的營收明細 Excel（美式第一杯、拿鐵(小/大)、鬆餅、貝果、紅茶、套餐等）。可依實際菜單修改 `prisma/seed.ts` 後重新執行 `npm run db:seed`（目前 seed 會清空並重建產品，若需保留訂單請改為僅新增/更新品項）。
