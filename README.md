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

複製 `.env.example` 為 `.env`，填上 PostgreSQL 連線：

```bash
cp .env.example .env
# 編輯 .env，設定 DATABASE_URL
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

瀏覽 [http://localhost:3000](http://localhost:3000)。

## 部署到 Railway

1. 在 [Railway](https://railway.app) 建立新專案。
2. 新增 **PostgreSQL** 服務，Railway 會自動產生 `DATABASE_URL`。
3. 新增 **Web Service**，連到本專案 Git 倉庫（或上傳程式碼）。
4. 在 Web Service 的 **Variables** 加入：
   - `DATABASE_URL`：從 PostgreSQL 服務複製（Railway 通常會自動注入）。
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

## 資料結構（Prisma Schema）

- **Category**：分類（飲品、輕食、套餐、其他）
- **Product**：品項名稱、售價（priceCents）、所屬分類
- **Order**：訂單編號、總額、狀態、建立時間
- **OrderItem**：訂單明細（品項、數量、單價、小計）

價格以「分」儲存（例如 120 元 → `priceCents: 12000`），避免浮點誤差。

## 品項來源

`prisma/seed.ts` 內品名與售價對應您提供的營收明細 Excel（美式第一杯、拿鐵(小/大)、鬆餅、貝果、紅茶、套餐等）。可依實際菜單修改 `prisma/seed.ts` 後重新執行 `npm run db:seed`（目前 seed 會清空並重建產品，若需保留訂單請改為僅新增/更新品項）。
