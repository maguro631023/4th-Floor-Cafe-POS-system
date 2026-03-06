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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [bomProduct, setBomProduct] = useState<Product | null>(null);
  const [bomItems, setBomItems] = useState<{ materialId: string; material: { name: string; unit: string }; quantityPerUnit: number }[]>([]);
  const [materials, setMaterials] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [bomSaving, setBomSaving] = useState(false);
  const [bomNewMaterialId, setBomNewMaterialId] = useState("");
  const [bomNewQty, setBomNewQty] = useState("");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectCategory = (list: Product[]) => {
    const ids = list.map((p) => p.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const batchDownload = () => {
    const list = selectedIds.size > 0 ? products.filter((p) => selectedIds.has(p.id)) : products;
    const CRLF = "\r\n";
    const headers = "品名,售價(元),分類,狀態" + CRLF;
    const rows = list
      .map(
        (p) =>
          `"${(p.name || "").replace(/"/g, '""')}",${p.priceCents / 100},"${p.category?.name ?? ""}",${p.isActive ? "啟用" : "停用"}`
      )
      .join(CRLF);
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `品項清單_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "ok", text: `已下載 ${list.length} 筆` });
  };

  const batchEnable = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setMessage({ type: "err", text: "請先勾選要上架的品項" });
      return;
    }
    setBatchBusy(true);
    setMessage(null);
    let done = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true }),
          credentials: "same-origin",
        });
        if (res.ok) {
          done++;
        } else {
          failed++;
          const err = await res.json().catch(() => ({}));
          console.warn(`[批次上架] ${id} 失敗:`, res.status, err);
        }
      } catch (e) {
        failed++;
        console.warn(`[批次上架] ${id} 請求失敗:`, e);
      }
    }
    setSelectedIds(new Set());
    fetchProducts();
    if (failed > 0) {
      setMessage({
        type: done > 0 ? "ok" : "err",
        text: done > 0 ? `已上架 ${done} 筆，${failed} 筆失敗` : `上架失敗（${failed} 筆），請確認已登入且具權限`,
      });
    } else {
      setMessage({ type: "ok", text: `已上架 ${done} 筆` });
    }
    setBatchBusy(false);
  };

  const batchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setMessage({ type: "err", text: "請先勾選要刪除的品項" });
      return;
    }
    if (!confirm(`確定要刪除所選 ${ids.length} 筆品項？已有訂單紀錄的品項將略過。`)) return;
    setBatchBusy(true);
    setMessage(null);
    let deleted = 0;
    let skipped = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) deleted++;
        else skipped++;
      } catch {
        skipped++;
      }
    }
    setSelectedIds(new Set());
    fetchProducts();
    setMessage({
      type: "ok",
      text: `已刪除 ${deleted} 筆${skipped > 0 ? `，${skipped} 筆因有訂單略過` : ""}`,
    });
    setBatchBusy(false);
  };

  type CsvRow = { name: string; priceCents?: number; categoryName?: string };

  /** 解析 CSV 取得品項列（品名、售價、分類） */
  const parseCsvRows = (text: string): CsvRow[] => {
    const normalized = text.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return [];
    const parseRow = (row: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === '"') {
          if (inQuote && row[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (c === "," && !inQuote) {
          out.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      out.push(cur.trim());
      return out;
    };
    const rows = lines.map((line) => parseRow(line));
    const first = rows[0];
    const nameIdx = first.findIndex((c) => c === "品名" || c.includes("品名"));
    const priceIdx = first.findIndex((c) => c.includes("售價"));
    const catIdx = first.findIndex((c) => c === "分類" || c.includes("分類"));
    const hasHeader = nameIdx >= 0 || priceIdx >= 0 || catIdx >= 0;
    const start = hasHeader ? 1 : 0;
    const result: CsvRow[] = [];
    for (let i = start; i < rows.length; i++) {
      const r = rows[i];
      const name = r[nameIdx >= 0 ? nameIdx : 0]?.trim().replace(/^"|"$/g, "").replace(/""/g, '"');
      if (!name) continue;
      let priceCents: number | undefined;
      if (priceIdx >= 0 && r[priceIdx]) {
        const raw = parseFloat(String(r[priceIdx]).replace(/[^\d.-]/g, ""));
        if (!isNaN(raw)) priceCents = Math.round(raw * 100);
      }
      const categoryName = catIdx >= 0 ? r[catIdx]?.trim().replace(/^"|"$/g, "") : undefined;
      result.push({ name, priceCents, categoryName });
    }
    return result;
  };

  const batchEnableFromCsv = async (file: File) => {
    const text = await file.text();
    const csvRows = parseCsvRows(text);
    if (csvRows.length === 0) {
      setMessage({ type: "err", text: "CSV 中無有效品名，請確認格式（品名 或 品名,售價,分類,狀態）" });
      return;
    }
    const nameToProducts = new Map<string, Product[]>();
    for (const p of products) {
      const list = nameToProducts.get(p.name) ?? [];
      list.push(p);
      nameToProducts.set(p.name, list);
    }
    const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

    const slugify = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return "cat_" + (h >>> 0).toString(36).slice(0, 12);
    };

    setBatchBusy(true);
    setMessage(null);

    const newCatNames = [...new Set(csvRows.map((r) => r.categoryName).filter(Boolean))] as string[];
    for (const name of newCatNames) {
      if (name && !categoryByName.has(name)) {
        try {
          const id = slugify(name);
          const res = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, name }),
            credentials: "same-origin",
          });
          if (res.ok) {
            categoryByName.set(name, id);
            setCategories((prev) => [...prev, { id, name }]);
          }
        } catch {
          //
        }
      }
    }

    let enabled = 0;
    let created = 0;
    let failed = 0;

    for (const row of csvRows) {
      const existing = nameToProducts.get(row.name);
      if (existing?.length) {
        for (const p of existing) {
          try {
            const res = await fetch(`/api/products/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isActive: true }),
              credentials: "same-origin",
            });
            if (res.ok) enabled++;
            else failed++;
          } catch {
            failed++;
          }
        }
      } else {
        const priceCents = row.priceCents ?? 0;
        const categoryId = row.categoryName ? categoryByName.get(row.categoryName) ?? null : null;
        try {
          const res = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: row.name,
              priceCents,
              categoryId,
            }),
            credentials: "same-origin",
          });
          if (res.ok) created++;
          else failed++;
        } catch {
          failed++;
        }
      }
    }

    fetchProducts();
    const parts: string[] = [];
    if (enabled > 0) parts.push(`已上架 ${enabled} 筆`);
    if (created > 0) parts.push(`新增 ${created} 筆`);
    if (failed > 0) parts.push(`${failed} 筆失敗`);
    setMessage({
      type: enabled + created > 0 ? "ok" : "err",
      text: parts.length ? parts.join("，") : "匯入失敗",
    });
    setBatchBusy(false);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMessage({ type: "err", text: "請選擇 .csv 檔案" });
      return;
    }
    batchEnableFromCsv(file);
    e.target.value = "";
  };

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

  useEffect(() => {
    if (!bomProduct) return;
    Promise.all([
      fetch(`/api/products/${bomProduct.id}/bom`).then((r) => r.json()).catch(() => []),
      fetch("/api/materials").then((r) => r.json()).catch(() => []),
    ]).then(([bom, mats]) => {
      setBomItems(bom);
      setMaterials(mats);
      setBomNewMaterialId("");
      setBomNewQty("");
    });
  }, [bomProduct?.id]);

  const addBomRow = () => {
    const mid = bomNewMaterialId.trim();
    const q = parseFloat(bomNewQty);
    if (!mid || isNaN(q) || q < 0) return;
    const mat = materials.find((m) => m.id === mid);
    if (!mat || bomItems.some((i) => i.materialId === mid)) return;
    setBomItems((prev) => [...prev, { materialId: mid, material: mat, quantityPerUnit: q }]);
    setBomNewMaterialId("");
    setBomNewQty("");
  };

  const removeBomRow = (materialId: string) => {
    setBomItems((prev) => prev.filter((i) => i.materialId !== materialId));
  };

  const updateBomQty = (materialId: string, quantityPerUnit: number) => {
    setBomItems((prev) =>
      prev.map((i) => (i.materialId === materialId ? { ...i, quantityPerUnit } : i))
    );
  };

  const saveBom = async () => {
    if (!bomProduct) return;
    setBomSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${bomProduct.id}/bom`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: bomItems.map((i) => ({ materialId: i.materialId, quantityPerUnit: i.quantityPerUnit })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "儲存失敗");
      setBomItems(data);
      setMessage({ type: "ok", text: "BOM 已儲存" });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "儲存失敗" });
    } finally {
      setBomSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">品項管理</h1>
      <p className="text-stone-600 text-sm">可修改品名與售價（元），停用後品項不會在收銀頁顯示。可新增或刪除品項（已有訂單紀錄的品項無法刪除）。</p>

      <div className="flex items-center gap-4">
        <a
          href="/categories"
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-amber-800 font-medium hover:bg-amber-50"
        >
          分類管理
        </a>
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
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={batchDownload}
            disabled={batchBusy}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-700 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            批次下載
          </button>
          <button
            type="button"
            onClick={batchEnable}
            disabled={batchBusy || selectedIds.size === 0}
            title={selectedIds.size === 0 ? "請先勾選要上架的品項" : undefined}
            className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-green-800 text-sm font-medium hover:bg-green-100 disabled:opacity-50"
          >
            批次上架
          </button>
          <button
            type="button"
            onClick={batchDelete}
            disabled={batchBusy || selectedIds.size === 0}
            title={selectedIds.size === 0 ? "請先勾選要刪除的品項" : undefined}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
          >
            批次刪除
          </button>
          <label
            title="上傳 CSV，依品名批次上架。格式：品名,售價,分類,狀態 或僅品名"
            className={`rounded-lg border border-green-400 bg-green-50 px-3 py-2 text-green-800 text-sm font-medium hover:bg-green-100 cursor-pointer inline-flex items-center ${batchBusy ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              disabled={batchBusy}
              className="sr-only"
            />
            CSV 匯入上架
          </label>
          {selectedIds.size === 0 && (
            <span className="text-stone-600 text-sm">（勾選品項或上傳 CSV 可批次上架）</span>
          )}
        </span>
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
                      <th className="px-2 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={list.length > 0 && list.every((p) => selectedIds.has(p.id))}
                          onChange={() => toggleSelectCategory(list)}
                          className="rounded border-stone-300"
                        />
                      </th>
                      <th className="px-4 py-2">品名</th>
                      <th className="px-4 py-2 w-28">售價（元）</th>
                      <th className="px-4 py-2 w-24">狀態</th>
                      <th className="px-4 py-2 w-40">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => (
                      <tr key={p.id} className="border-b border-stone-100">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="rounded border-stone-300"
                          />
                        </td>
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
                                onClick={() => setBomProduct(p)}
                                className="text-emerald-700 font-medium hover:underline"
                              >
                                BOM
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

      {bomProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setBomProduct(null)}>
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-stone-200 font-semibold text-stone-800">
              BOM：{bomProduct.name}
            </div>
            <p className="px-4 py-2 text-stone-600 text-sm">每 1 單位品項所需原料（訂單完成時會依此自動扣原料庫存）</p>
            <div className="overflow-y-auto flex-1 px-4 py-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-stone-600 border-b border-stone-200">
                    <th className="py-1.5">原料</th>
                    <th className="py-1.5 w-24">用量/單位</th>
                    <th className="py-1.5 w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {bomItems.map((i) => (
                    <tr key={i.materialId} className="border-b border-stone-100">
                      <td className="py-1.5">{i.material.name} ({i.material.unit})</td>
                      <td className="py-1.5">
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={i.quantityPerUnit}
                          onChange={(e) => updateBomQty(i.materialId, parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-stone-300 px-2 py-1"
                        />
                      </td>
                      <td className="py-1.5">
                        <button type="button" onClick={() => removeBomRow(i.materialId)} className="text-red-600 text-xs hover:underline">移除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap gap-2 items-end mt-3 border-t border-stone-200 pt-3">
                <select
                  value={bomNewMaterialId}
                  onChange={(e) => setBomNewMaterialId(e.target.value)}
                  className="rounded border border-stone-300 px-2 py-1.5 text-sm w-36"
                >
                  <option value="">選擇原料</option>
                  {materials.filter((m) => !bomItems.some((i) => i.materialId === m.id)).map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={bomNewQty}
                  onChange={(e) => setBomNewQty(e.target.value)}
                  placeholder="用量"
                  className="rounded border border-stone-300 px-2 py-1.5 w-20 text-sm"
                />
                <button
                  type="button"
                  onClick={addBomRow}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-white text-sm hover:bg-emerald-700"
                >
                  加入
                </button>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBomProduct(null)}
                className="rounded border border-stone-300 px-3 py-1.5 text-stone-700 text-sm hover:bg-stone-50"
              >
                關閉
              </button>
              <button
                type="button"
                onClick={saveBom}
                disabled={bomSaving}
                className="rounded bg-amber-600 px-3 py-1.5 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {bomSaving ? "儲存中..." : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
