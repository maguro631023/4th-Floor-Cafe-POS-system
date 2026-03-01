"use client";

import { useEffect, useState, useCallback } from "react";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  category: { id: string; name: string } | null;
};

type CartItem = { product: Product; quantity: number };

const QUICK_TABLES = ["1", "2", "3", "4", "5", "6", "7", "8", "外帶"];

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNo, setTableNo] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/products")
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
    if (cart.length === 0) {
      setMessage({ type: "err", text: "請先加入品項" });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNo: tableNo.trim() || null,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitPriceCents: i.product.priceCents,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "結帳失敗");
      const tableLabel = data.tableNo ? ` 桌號：${data.tableNo}` : "";
      setCart([]);
      setMessage({ type: "ok", text: `結帳成功 訂單號：${data.orderNo}${tableLabel}` });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "結帳失敗" });
    } finally {
      setSubmitting(false);
    }
  };

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.category?.name ?? "其他";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="text-center py-12 text-stone-500">載入品項中...</div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">品項</h2>
        <div className="space-y-6">
          {Object.entries(byCategory).map(([catName, list]) => (
            <div key={catName}>
              <h3 className="text-sm font-medium text-amber-800 mb-2">{catName}</h3>
              <div className="flex flex-wrap gap-2">
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="px-4 py-2 rounded-lg bg-white border border-amber-200 text-stone-700 hover:bg-amber-50 hover:border-amber-300 transition"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-amber-700">${(p.priceCents / 100).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4 h-fit">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">購物車</h2>
        <div className="mb-3">
          <label className="block text-sm font-medium text-stone-600 mb-1">桌號</label>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={tableNo}
              onChange={(e) => setTableNo(e.target.value)}
              placeholder="可輸入或點選"
              className="rounded border border-stone-300 px-3 py-2 w-28 text-sm"
            />
            {QUICK_TABLES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTableNo((prev) => (prev === t ? "" : t))}
                className={`px-3 py-1.5 rounded text-sm font-medium border transition ${
                  tableNo === t
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white border-amber-200 text-stone-700 hover:bg-amber-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {cart.length === 0 ? (
          <p className="text-stone-500 text-sm">尚未加入品項</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {cart.map((i) => (
              <li key={i.product.id} className="flex items-center justify-between text-sm">
                <span>{i.product.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(i.product.id, -1)}
                    className="w-7 h-7 rounded border border-stone-300 hover:bg-stone-100"
                  >
                    −
                  </button>
                  <span className="w-8 text-center">{i.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(i.product.id, 1)}
                    className="w-7 h-7 rounded border border-stone-300 hover:bg-stone-100"
                  >
                    +
                  </button>
                </div>
                <span className="text-amber-700 font-medium">
                  ${((i.product.priceCents * i.quantity) / 100).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-stone-200 pt-3 flex justify-between font-semibold text-stone-800">
          <span>總計</span>
          <span className="text-amber-700">${(totalCents / 100).toLocaleString()}</span>
        </div>
        <button
          type="button"
          onClick={checkout}
          disabled={submitting || cart.length === 0}
          className="mt-4 w-full py-3 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "結帳中..." : "結帳"}
        </button>
        {message && (
          <p
            className={`mt-3 text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
