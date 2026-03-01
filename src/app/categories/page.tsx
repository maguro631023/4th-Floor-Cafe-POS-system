"use client";

import { useState, useEffect, useCallback } from "react";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  _count: { products: number };
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditSortOrder(String(c.sortOrder));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditSortOrder("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const sortOrder = parseInt(editSortOrder, 10);
    if (isNaN(sortOrder) || sortOrder < 0) {
      setMessage({ type: "err", text: "請輸入有效排序數字（≥0）" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), sortOrder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "更新失敗");
      setCategories((prev) =>
        prev.map((x) => (x.id === editingId ? { ...x, name: data.name, sortOrder: data.sortOrder } : x))
      );
      setMessage({ type: "ok", text: "已儲存" });
      setEditingId(null);
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "更新失敗" });
    } finally {
      setSaving(false);
    }
  };

  const submitNew = async () => {
    if (!newId.trim()) {
      setMessage({ type: "err", text: "請輸入分類代碼（小寫英文、數字、底線）" });
      return;
    }
    if (!newName.trim()) {
      setMessage({ type: "err", text: "請輸入分類名稱" });
      return;
    }
    const id = newId.trim().toLowerCase().replace(/\s+/g, "_");
    const sortOrder = newSortOrder === "" ? undefined : parseInt(newSortOrder, 10);
    if (newSortOrder !== "" && (isNaN(sortOrder!) || sortOrder! < 0)) {
      setMessage({ type: "err", text: "排序請輸入 ≥0 的數字" });
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: newName.trim(),
          sortOrder: newSortOrder === "" ? undefined : sortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "新增失敗");
      setCategories((prev) => [...prev, data]);
      setMessage({ type: "ok", text: "已新增分類" });
      setShowAddForm(false);
      setNewId("");
      setNewName("");
      setNewSortOrder("");
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "新增失敗" });
    } finally {
      setAdding(false);
    }
  };

  const deleteCategory = async (c: Category) => {
    const hint = c._count.products > 0
      ? `\n此分類下 ${c._count.products} 個品項將改為「未分類」。`
      : "";
    if (!confirm(`確定要刪除分類「${c.name}」？${hint}`)) return;
    setDeletingId(c.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || "刪除失敗");
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
      setMessage({ type: "ok", text: "已刪除分類" });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "刪除失敗" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">分類管理</h1>
      <p className="text-stone-600 text-sm">
        可新增、修改、刪除分類。代碼僅限小寫英文、數字與底線，用於品項歸類。刪除分類時，該分類下的品項會改為「未分類」。
      </p>

      <div className="flex items-center gap-4">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-white font-medium hover:bg-amber-700"
          >
            新增分類
          </button>
        ) : (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-600">代碼</span>
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="例：dessert"
                className="rounded border border-stone-300 px-2 py-1.5 w-32 font-mono lowercase"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-600">名稱</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：甜點"
                className="rounded border border-stone-300 px-2 py-1.5 w-32"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-600">排序</span>
              <input
                type="number"
                min={0}
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value)}
                placeholder="自動"
                className="rounded border border-stone-300 px-2 py-1.5 w-20"
              />
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
                  setNewId("");
                  setNewName("");
                  setNewSortOrder("");
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
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-600 border-b border-stone-200 bg-stone-50">
                  <th className="px-4 py-2 w-32">代碼</th>
                  <th className="px-4 py-2">名稱</th>
                  <th className="px-4 py-2 w-20">排序</th>
                  <th className="px-4 py-2 w-24">品項數</th>
                  <th className="px-4 py-2 w-40">操作</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-stone-100">
                    <td className="px-4 py-2 font-mono text-stone-600">{c.id}</td>
                    <td className="px-4 py-2">
                      {editingId === c.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full max-w-xs rounded border border-stone-300 px-2 py-1"
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === c.id ? (
                        <input
                          type="number"
                          min={0}
                          value={editSortOrder}
                          onChange={(e) => setEditSortOrder(e.target.value)}
                          className="w-20 rounded border border-stone-300 px-2 py-1"
                        />
                      ) : (
                        c.sortOrder
                      )}
                    </td>
                    <td className="px-4 py-2 text-stone-600">{c._count.products}</td>
                    <td className="px-4 py-2">
                      {editingId === c.id ? (
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
                            onClick={() => startEdit(c)}
                            className="text-amber-700 font-medium hover:underline"
                          >
                            編輯
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCategory(c)}
                            disabled={deletingId === c.id}
                            className="rounded border border-red-300 bg-red-50 px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === c.id ? "刪除中..." : "刪除"}
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
      )}
    </div>
  );
}
