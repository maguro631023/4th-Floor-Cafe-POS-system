"use client";

import { useState, useEffect, useCallback } from "react";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  isActive: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    fetch("/api/products?all=1")
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(String(Math.round(p.priceCents / 100)));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const price = Math.round(parseFloat(editPrice) * 100);
    if (isNaN(price) || price < 0) {
      setMessage({ type: "err", text: "請輸入有效售價（元）" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), priceCents: price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "更新失敗");
      setProducts((prev) =>
        prev.map((x) => (x.id === editingId ? { ...x, name: data.name, priceCents: data.priceCents } : x))
      );
      setMessage({ type: "ok", text: "已儲存" });
      setEditingId(null);
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "更新失敗" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "更新失敗");
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, isActive: data.isActive } : x))
      );
    } catch {
      setMessage({ type: "err", text: "切換啟用狀態失敗" });
    }
  };

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.category?.name ?? "未分類";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">品項管理</h1>
      <p className="text-stone-600 text-sm">可修改品名與售價（元），停用後品項不會在收銀頁顯示。</p>

      {message && (
        <p className={message.type === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
          {message.text}
        </p>
      )}

      {loading && <p className="text-stone-500">載入中...</p>}
      {!loading && (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([catName, list]) => (
            <div key={catName} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <h2 className="bg-amber-50 px-4 py-2 font-semibold text-stone-800 border-b border-amber-200">
                {catName}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-stone-600 border-b border-stone-200 bg-stone-50">
                      <th className="px-4 py-2">品名</th>
                      <th className="px-4 py-2 w-28">售價（元）</th>
                      <th className="px-4 py-2 w-24">狀態</th>
                      <th className="px-4 py-2 w-32">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => (
                      <tr key={p.id} className="border-b border-stone-100">
                        <td className="px-4 py-2">
                          {editingId === p.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded border border-stone-300 px-2 py-1"
                            />
                          ) : (
                            <span className={p.isActive ? "" : "text-stone-400"}>{p.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {editingId === p.id ? (
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-full rounded border border-stone-300 px-2 py-1"
                            />
                          ) : (
                            <span className={p.isActive ? "" : "text-stone-400"}>
                              ${(p.priceCents / 100).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => toggleActive(p)}
                            className={`text-xs px-2 py-1 rounded ${p.isActive ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}`}
                          >
                            {p.isActive ? "啟用" : "停用"}
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          {editingId === p.id ? (
                            <span className="flex gap-2">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={saving}
                                className="text-amber-700 font-medium hover:underline disabled:opacity-50"
                              >
                                {saving ? "儲存中..." : "儲存"}
                              </button>
                              <button type="button" onClick={cancelEdit} className="text-stone-500 hover:underline">
                                取消
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              className="text-amber-700 font-medium hover:underline"
                            >
                              編輯
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
