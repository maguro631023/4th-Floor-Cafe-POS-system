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

type Category = { id: string; name: string };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

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

  const submitNew = async () => {
    const price = Math.round(parseFloat(newPrice) * 100);
    if (!newName.trim()) {
      setMessage({ type: "err", text: "請輸入品名" });
      return;
    }
    if (isNaN(price) || price < 0) {
      setMessage({ type: "err", text: "請輸入有效售價（元）" });
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          priceCents: price,
          categoryId: newCategoryId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "新增失敗");
      setProducts((prev) => [...prev, data]);
      setMessage({ type: "ok", text: "已新增品項" });
      setShowAddForm(false);
      setNewName("");
      setNewPrice("");
      setNewCategoryId("");
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "新增失敗" });
    } finally {
      setAdding(false);
    }
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`確定要刪除「${p.name}」？若此品項已有訂單紀錄則無法刪除。`)) return;
    setDeletingId(p.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || "刪除失敗");
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setMessage({ type: "ok", text: "已刪除品項" });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "刪除失敗" });
    } finally {
      setDeletingId(null);
    }
  };

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.category?.name ?? "未分類";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">品項管理</h1>
      <p className="text-stone-600 text-sm">可修改品名與售價（元），停用後品項不會在收銀頁顯示。可新增或刪除品項（已有訂單紀錄的品項無法刪除）。</p>

      <div className="flex items-center gap-4">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-white font-medium hover:bg-amber-700"
          >
            新增品項
          </button>
        ) : (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-600">品名</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：拿鐵(大)"
                className="rounded border border-stone-300 px-2 py-1.5 w-40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-600">售價（元）</span>
              <input
                type="number"
                min={0}
                step={1}
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="100"
                className="rounded border border-stone-300 px-2 py-1.5 w-24"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-600">分類</span>
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="rounded border border-stone-300 px-2 py-1.5 w-32"
              >
                <option value="">未分類</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitNew}
                disabled={adding}
                className="rounded bg-amber-600 px-3 py-1.5 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {adding ? "新增中..." : "送出"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewName("");
                  setNewPrice("");
                  setNewCategoryId("");
                  setMessage(null);
                }}
                className="rounded border border-stone-300 px-3 py-1.5 text-stone-600 text-sm hover:bg-stone-100"
              >
                取消
              </button>
            </div>
          </div>
        )}
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
                      <th className="px-4 py-2 w-28">售價（元）</th>
                      <th className="px-4 py-2 w-24">狀態</th>
                      <th className="px-4 py-2 w-40">操作</th>
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
                            <span className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                className="text-amber-700 font-medium hover:underline"
                              >
                                編輯
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProduct(p)}
                                disabled={deletingId === p.id}
                                className="text-red-600 font-medium hover:underline disabled:opacity-50"
                              >
                                {deletingId === p.id ? "刪除中..." : "刪除"}
                              </button>
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
