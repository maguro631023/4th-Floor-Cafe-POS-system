"use client";

import { useState, useEffect, useCallback } from "react";

type Product = {
  id: string;
  name: string;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  category: { id: string; name: string } | null;
};

type Filter = "all" | "tracked" | "low";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("tracked");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [addStockId, setAddStockId] = useState<string | null>(null);
  const [addStockQty, setAddStockQty] = useState("");
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
    setEditStock(p.stockQuantity != null ? String(p.stockQuantity) : "");
    setEditThreshold(p.lowStockThreshold != null ? String(p.lowStockThreshold) : "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStock("");
    setEditThreshold("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const stock = editStock === "" ? null : parseInt(editStock, 10);
    const threshold = editThreshold === "" ? null : parseInt(editThreshold, 10);
    if (editStock !== "" && (isNaN(stock!) || stock! < 0)) {
      setMessage({ type: "err", text: "請輸入有效庫存數量" });
      return;
    }
    if (editThreshold !== "" && (isNaN(threshold!) || threshold! < 0)) {
      setMessage({ type: "err", text: "請輸入有效低庫存門檻" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockQuantity: stock,
          lowStockThreshold: threshold,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "更新失敗");
      setProducts((prev) =>
        prev.map((x) =>
          x.id === editingId
            ? { ...x, stockQuantity: data.stockQuantity, lowStockThreshold: data.lowStockThreshold }
            : x
        )
      );
      setMessage({ type: "ok", text: "已儲存" });
      setEditingId(null);
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "更新失敗" });
    } finally {
      setSaving(false);
    }
  };

  const doAddStock = async () => {
    if (!addStockId) return;
    const qty = parseInt(addStockQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setMessage({ type: "err", text: "請輸入有效入庫數量" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${addStockId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "入庫失敗");
      setProducts((prev) =>
        prev.map((x) => (x.id === addStockId ? { ...x, stockQuantity: data.stockQuantity } : x))
      );
      setMessage({ type: "ok", text: `已入庫 +${qty}` });
      setAddStockId(null);
      setAddStockQty("");
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "入庫失敗" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter((p) => {
    if (filter === "all") return true;
    if (filter === "tracked") return p.stockQuantity != null;
    if (filter === "low")
      return (
        p.stockQuantity != null &&
        p.lowStockThreshold != null &&
        p.stockQuantity <= p.lowStockThreshold
      );
    return true;
  });

  const byCategory = filtered.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.category?.name ?? "未分類";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const isLowStock = (p: Product) =>
    p.stockQuantity != null &&
    p.lowStockThreshold != null &&
    p.stockQuantity <= p.lowStockThreshold;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">庫存管理</h1>
      <p className="text-stone-600 text-sm">
        可為品項設定庫存數量與低庫存門檻，未設定庫存的品項不追蹤。點「編輯」可設定庫存，點「入庫」可快速增加數量。
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-stone-600 text-sm">篩選：</span>
        {(["tracked", "low", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 text-sm font-medium border transition ${
              filter === f
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
            }`}
          >
            {f === "tracked" ? "有庫存追蹤" : f === "low" ? "低庫存" : "全部"}
          </button>
        ))}
      </div>

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
                      <th className="px-4 py-2 w-24">庫存</th>
                      <th className="px-4 py-2 w-24">低庫存門檻</th>
                      <th className="px-4 py-2 w-32">狀態</th>
                      <th className="px-4 py-2 w-40">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => (
                      <tr key={p.id} className="border-b border-stone-100">
                        <td className="px-4 py-2">{p.name}</td>
                        <td className="px-4 py-2">
                          {editingId === p.id ? (
                            <input
                              type="number"
                              min={0}
                              value={editStock}
                              onChange={(e) => setEditStock(e.target.value)}
                              placeholder="不追蹤"
                              className="w-20 rounded border border-stone-300 px-2 py-1"
                            />
                          ) : (
                            <span className={isLowStock(p) ? "text-red-600 font-medium" : ""}>
                              {p.stockQuantity != null ? p.stockQuantity : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {editingId === p.id ? (
                            <input
                              type="number"
                              min={0}
                              value={editThreshold}
                              onChange={(e) => setEditThreshold(e.target.value)}
                              placeholder="不設定"
                              className="w-20 rounded border border-stone-300 px-2 py-1"
                            />
                          ) : (
                            p.lowStockThreshold != null ? p.lowStockThreshold : "—"
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {p.stockQuantity == null ? (
                            <span className="text-stone-400 text-xs">未追蹤</span>
                          ) : isLowStock(p) ? (
                            <span className="text-red-600 text-xs font-medium">低庫存</span>
                          ) : (
                            <span className="text-green-600 text-xs">正常</span>
                          )}
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
                          ) : addStockId === p.id ? (
                            <span className="flex gap-2 items-center">
                              <input
                                type="number"
                                min={1}
                                value={addStockQty}
                                onChange={(e) => setAddStockQty(e.target.value)}
                                placeholder="數量"
                                className="w-16 rounded border border-stone-300 px-2 py-1 text-sm"
                              />
                              <button
                                type="button"
                                onClick={doAddStock}
                                disabled={saving}
                                className="text-green-700 font-medium hover:underline disabled:opacity-50"
                              >
                                {saving ? "入庫中..." : "確認"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAddStockId(null); setAddStockQty(""); }}
                                className="text-stone-500 hover:underline"
                              >
                                取消
                              </button>
                            </span>
                          ) : (
                            <span className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                className="text-amber-700 font-medium hover:underline"
                              >
                                編輯
                              </button>
                              {p.stockQuantity != null && (
                                <button
                                  type="button"
                                  onClick={() => { setAddStockId(p.id); setAddStockQty(""); }}
                                  className="text-green-700 font-medium hover:underline"
                                >
                                  入庫
                                </button>
                              )}
                            </span>
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
