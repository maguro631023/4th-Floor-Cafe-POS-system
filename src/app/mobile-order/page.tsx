"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  category: { id: string; name: string } | null;
};

type CartItem = { product: Product; quantity: number };

export default function MobileOrderPage() {
  const searchParams = useSearchParams();
  const initialTable = searchParams.get("table") ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNo, setTableNo] = useState(initialTable);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/public-products")
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = useCallback((product: Product, qty = 1) => {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.product.id === product.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [...prev, { product, quantity: qty }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((x) =>
          x.product.id === productId ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x
        )
        .filter((x) => x.quantity > 0)
    );
  }, []);

  const totalCents = cart.reduce((sum, i) => sum + i.product.priceCents * i.quantity, 0);

  const checkout = async () => {
    if (!tableNo.trim()) {
      setMessage({ type: "err", text: "請先輸入桌號" });
      return;
    }
    if (cart.length === 0) {
      setMessage({ type: "err", text: "請先選擇品項" });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const d = new Date();
      const clientDate = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const res = await fetch("/api/mobile-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNo: tableNo.trim(),
          clientDate,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error?.message || "送單失敗，請稍後再試");
      }
      setCart([]);
      setMessage({
        type: "ok",
        text: `已送出訂單 ${data.orderNo ?? ""}，請稍候店員確認。`,
      });
    } catch (err: any) {
      setMessage({ type: "err", text: err?.message || "送單失敗，請稍後再試" });
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.category?.name ?? "未分類";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-center">4樓咖啡 線上點餐</h1>
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          桌號
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="例如：1, 2, 外帶"
            value={tableNo}
            onChange={(e) => setTableNo(e.target.value)}
          />
        </label>
        <p className="text-xs text-gray-600">
          請確認桌號與桌上貼紙一致，送出後請留意店員送餐。
        </p>
      </div>

      {loading ? (
        <p>載入品項中...</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <h2 className="font-semibold mb-2">{cat}</h2>
              <div className="space-y-2">
                {list.map((p) => {
                  const inCart = cart.find((x) => x.product.id === p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border rounded px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-sm text-gray-600">
                          ${p.priceCents / 100}
                          {inCart && inCart.quantity > 0 && (
                            <span className="ml-2 text-amber-700">
                              x {inCart.quantity} = ${(inCart.quantity * p.priceCents) / 100}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 border rounded disabled:opacity-40"
                          onClick={() => updateQty(p.id, -1)}
                          disabled={!inCart}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 bg-amber-900 text-amber-50 rounded text-sm"
                          onClick={() => addToCart(p, 1)}
                        >
                          加入
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 border rounded"
                          onClick={() => updateQty(p.id, 1)}
                          disabled={!inCart}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between items-center">
          <span>合計</span>
          <span className="text-lg font-bold">${totalCents / 100}</span>
        </div>
        <button
          type="button"
          className="w-full py-2 rounded bg-emerald-600 text-white font-semibold disabled:opacity-50"
          onClick={checkout}
          disabled={submitting || loading}
        >
          {submitting ? "送出中..." : "送出訂單"}
        </button>
        {message && (
          <p
            className={
              message.type === "ok" ? "text-sm text-emerald-700" : "text-sm text-red-600"
            }
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

