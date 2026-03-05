"use client";

import { useState, useEffect, useCallback } from "react";

type Product = {
  id: string;
  name: string;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  category: { id: string; name: string } | null;
};

type Material = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number | null;
};

type Filter = "all" | "tracked" | "low";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("tracked");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [addStockId, setAddStockId] = useState<string | null>(null);
  const [addStockQty, setAddStockQty] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [matEditId, setMatEditId] = useState<string | null>(null);
  const [matEditThreshold, setMatEditThreshold] = useState("");
  const [matAddStockId, setMatAddStockId] = useState<string | null>(null);
  const [matAddStockDelta, setMatAddStockDelta] = useState("");
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("");
  const [newMatThreshold, setNewMatThreshold] = useState("");
  const [deletingMatId, setDeletingMatId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/products?all=1").then((r) => r.json()).catch(() => []),
      fetch("/api/materials").then((r) => r.json()).catch(() => []),
    ])
      .then(([prods, mats]) => {
        setProducts(prods);
        setMaterials(mats);
      })
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

  const isMatLowStock = (m: Material) =>
    m.lowStockThreshold != null && m.stockQuantity <= m.lowStockThreshold;

  const saveMatThreshold = async () => {
    if (!matEditId) return;
    const v = matEditThreshold === "" ? null : parseInt(matEditThreshold, 10);
    if (matEditThreshold !== "" && (isNaN(v!) || v! < 0)) {
      setMessage({ type: "err", text: "請輸入有效門檻" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/materials/${matEditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lowStockThreshold: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "更新失敗");
      setMaterials((prev) =>
        prev.map((x) => (x.id === matEditId ? { ...x, lowStockThreshold: data.lowStockThreshold } : x))
      );
      setMessage({ type: "ok", text: "已儲存" });
      setMatEditId(null);
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "更新失敗" });
    } finally {
      setSaving(false);
    }
  };

  const doMatStock = async () => {
    if (!matAddStockId) return;
    const delta = parseInt(matAddStockDelta, 10);
    if (isNaN(delta) || delta === 0) {
      setMessage({ type: "err", text: "請輸入有效數量（正數入庫、負數出庫）" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/materials/${matAddStockId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "調整失敗");
      setMaterials((prev) =>
        prev.map((x) => (x.id === matAddStockId ? { ...x, stockQuantity: data.stockQuantity } : x))
      );
      setMessage({ type: "ok", text: delta >= 0 ? `已入庫 +${delta}` : `已出庫 ${delta}` });
      setMatAddStockId(null);
      setMatAddStockDelta("");
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "調整失敗" });
    } finally {
      setSaving(false);
    }
  };

  const deleteMaterial = async (m: Material) => {
    if (!confirm(`確定要刪除原料「${m.name}」？若已有品項 BOM 使用此原料，將一併移除。`)) return;
    setDeletingMatId(m.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/materials/${m.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || "刪除失敗");
      setMaterials((prev) => prev.filter((x) => x.id !== m.id));
      setMessage({ type: "ok", text: "已刪除原料" });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "刪除失敗" });
    } finally {
      setDeletingMatId(null);
    }
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`確定要刪除品項「${p.name}」？若此品項已有訂單紀錄則無法刪除。`)) return;
    setDeletingProductId(p.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (data?.error && (typeof data.error === "string" ? data.error : data.error.message)) ||
          data?.message ||
          "刪除失敗";
        throw new Error(msg);
      }
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      setMessage({ type: "ok", text: "已刪除品項" });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "刪除失敗" });
    } finally {
      setDeletingProductId(null);
    }
  };

  const addMaterial = async () => {
    const name = newMatName.trim();
    const unit = newMatUnit.trim();
    if (!name || !unit) {
      setMessage({ type: "err", text: "請填寫原料名稱與單位" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          unit,
          lowStockThreshold: newMatThreshold === "" ? null : parseInt(newMatThreshold, 10) || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "新增失敗");
      setMaterials((prev) => [...prev, data]);
      setMessage({ type: "ok", text: "已新增原料" });
      setShowAddMaterial(false);
      setNewMatName("");
      setNewMatUnit("");
      setNewMatThreshold("");
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "新增失敗" });
    } finally {
      setSaving(false);
    }
  };

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
          <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
            <h2 className="bg-emerald-50 px-4 py-2 font-semibold text-stone-800 border-b border-emerald-200">
              原料庫存（訂單完成時依 BOM 自動扣減）
            </h2>
            <div className="p-4 space-y-3">
              {!showAddMaterial ? (
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(true)}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                >
                  新增原料
                </button>
              ) : (
                <div className="flex flex-wrap gap-2 items-end border border-stone-200 rounded-lg p-3 bg-stone-50">
                  <label className="flex flex-col gap-1 text-sm">
                    名稱
                    <input
                      value={newMatName}
                      onChange={(e) => setNewMatName(e.target.value)}
                      placeholder="例：咖啡豆"
                      className="rounded border border-stone-300 px-2 py-1 w-28"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    單位
                    <input
                      value={newMatUnit}
                      onChange={(e) => setNewMatUnit(e.target.value)}
                      placeholder="例：g, ml"
                      className="rounded border border-stone-300 px-2 py-1 w-20"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    低庫存門檻
                    <input
                      type="number"
                      min={0}
                      value={newMatThreshold}
                      onChange={(e) => setNewMatThreshold(e.target.value)}
                      placeholder="選填"
                      className="rounded border border-stone-300 px-2 py-1 w-24"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={addMaterial}
                    disabled={saving}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "新增中..." : "確認"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddMaterial(false); setNewMatName(""); setNewMatUnit(""); setNewMatThreshold(""); }}
                    className="text-stone-500 text-sm hover:underline"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-stone-600 border-b border-stone-200 bg-stone-50">
                    <th className="px-4 py-2">原料名稱</th>
                    <th className="px-4 py-2 w-16">單位</th>
                    <th className="px-4 py-2 w-24">庫存</th>
                    <th className="px-4 py-2 w-24">低庫存門檻</th>
                    <th className="px-4 py-2 w-28">狀態</th>
                    <th className="px-4 py-2 w-44">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-stone-500">
                        尚無原料，請先新增。品項 BOM 請至「品項管理」設定。
                      </td>
                    </tr>
                  ) : (
                    materials.map((m) => (
                      <tr key={m.id} className="border-b border-stone-100">
                        <td className="px-4 py-2">{m.name}</td>
                        <td className="px-4 py-2">{m.unit}</td>
                        <td className={`px-4 py-2 ${isMatLowStock(m) ? "text-red-600 font-medium" : ""}`}>
                          {m.stockQuantity}
                        </td>
                        <td className="px-4 py-2">
                          {matEditId === m.id ? (
                            <input
                              type="number"
                              min={0}
                              value={matEditThreshold}
                              onChange={(e) => setMatEditThreshold(e.target.value)}
                              className="w-20 rounded border border-stone-300 px-2 py-1"
                            />
                          ) : (
                            m.lowStockThreshold != null ? m.lowStockThreshold : "—"
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isMatLowStock(m) ? (
                            <span className="text-red-600 text-xs font-medium">低庫存</span>
                          ) : (
                            <span className="text-green-600 text-xs">正常</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {matEditId === m.id ? (
                            <span className="flex gap-2">
                              <button type="button" onClick={saveMatThreshold} disabled={saving} className="text-amber-700 font-medium hover:underline disabled:opacity-50">儲存</button>
                              <button type="button" onClick={() => setMatEditId(null)} className="text-stone-500 hover:underline">取消</button>
                            </span>
                          ) : matAddStockId === m.id ? (
                            <span className="flex gap-2 items-center">
                              <input
                                type="number"
                                value={matAddStockDelta}
                                onChange={(e) => setMatAddStockDelta(e.target.value)}
                                placeholder="+入庫 / -出庫"
                                className="w-24 rounded border border-stone-300 px-2 py-1 text-sm"
                              />
                              <button type="button" onClick={doMatStock} disabled={saving} className="text-green-700 font-medium hover:underline disabled:opacity-50">確認</button>
                              <button type="button" onClick={() => { setMatAddStockId(null); setMatAddStockDelta(""); }} className="text-stone-500 hover:underline">取消</button>
                            </span>
                          ) : (
                            <span className="flex gap-2">
                              <button type="button" onClick={() => { setMatEditId(m.id); setMatEditThreshold(m.lowStockThreshold != null ? String(m.lowStockThreshold) : ""); }} className="text-amber-700 font-medium hover:underline">編輯門檻</button>
                              <button type="button" onClick={() => { setMatAddStockId(m.id); setMatAddStockDelta(""); }} className="text-green-700 font-medium hover:underline">入/出庫</button>
                              <button type="button" onClick={() => deleteMaterial(m)} disabled={deletingMatId === m.id} className="text-red-600 font-medium hover:underline disabled:opacity-50">{deletingMatId === m.id ? "刪除中..." : "刪除"}</button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
                              <button
                                type="button"
                                onClick={() => deleteProduct(p)}
                                disabled={deletingProductId === p.id}
                                className="text-red-600 font-medium hover:underline disabled:opacity-50"
                              >
                                {deletingProductId === p.id ? "刪除中..." : "刪除"}
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
