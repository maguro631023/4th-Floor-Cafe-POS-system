"use client";

import { useState, useEffect, useCallback } from "react";

type OrderItem = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  product: { id: string; name: string };
};

type Order = {
  id: string;
  orderNo: string;
  tableNo: string | null;
  totalCents: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "待處理" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

export default function OrderManagePage() {
  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(getLocalDate);
  const [noDateFilter, setNoDateFilter] = useState(false);
  const [tableFilter, setTableFilter] = useState("");
  const [orderNoFilter, setOrderNoFilter] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTableNo, setEditTableNo] = useState("");
  const [editStatus, setEditStatus] = useState<string>("COMPLETED");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (!noDateFilter && date) {
      params.set("date", date);
      params.set("tz", String(-new Date().getTimezoneOffset() / 60));
    }
    if (tableFilter.trim()) params.set("table", tableFilter.trim());
    if (orderNoFilter.trim()) params.set("orderNo", orderNoFilter.trim());
    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [date, noDateFilter, tableFilter, orderNoFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const startEdit = (o: Order) => {
    setEditingId(o.id);
    setEditTableNo(o.tableNo ?? "");
    setEditStatus(o.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNo: editTableNo.trim() || null,
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "更新失敗");
      setOrders((prev) =>
        prev.map((x) =>
          x.id === editingId
            ? { ...x, tableNo: data.tableNo, status: data.status }
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

  const deleteOrder = async (o: Order) => {
    if (!confirm(`確定要刪除訂單 ${o.orderNo}？此操作無法復原。`)) return;
    setDeletingId(o.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${o.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || "刪除失敗");
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
      setMessage({ type: "ok", text: "已刪除訂單" });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "刪除失敗" });
    } finally {
      setDeletingId(null);
    }
  };

  const statusLabel: Record<string, string> = {
    PENDING: "待處理",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
  };

  const downloadOrderDetails = () => {
    if (orders.length === 0) return;
    const headers = ["訂單編號", "桌號", "狀態", "下單時間", "訂單總額(元)", "品名", "數量", "單價(元)", "小計(元)"];
    const rows: string[][] = [];
    for (const o of orders) {
      const orderMeta = [
        o.orderNo,
        o.tableNo ?? "",
        statusLabel[o.status] ?? o.status,
        new Date(o.createdAt).toLocaleString("zh-TW"),
        String(o.totalCents / 100),
      ];
      if (o.items.length === 0) {
        rows.push([...orderMeta, "", "", "", ""]);
      } else {
        for (const item of o.items) {
          rows.push([
            ...orderMeta,
            (item.product?.name ?? "").replace(/"/g, '""'),
            String(item.quantity),
            String(item.unitPriceCents / 100),
            String(item.subtotalCents / 100),
          ]);
        }
      }
    }
    const lines = [headers.join(","), ...rows.map((r) => r.map((c) => (c.includes(",") || c.includes('"') ? `"${c}"` : c)).join(","))];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateLabel = noDateFilter ? "全部" : date;
    a.download = `訂單明細_${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">訂單管理</h1>
      <p className="text-stone-600 text-sm">可編輯訂單桌號、狀態，或刪除訂單。刪除後無法復原。</p>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-600">日期</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={noDateFilter}
              className="rounded border border-stone-300 px-3 py-2 disabled:opacity-50"
            />
            <label className="flex items-center gap-1 text-sm text-stone-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={noDateFilter}
                onChange={(e) => setNoDateFilter(e.target.checked)}
              />
              不限日期
            </label>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-600">桌號</span>
          <input
            type="text"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            placeholder="篩選桌號"
            className="rounded border border-stone-300 px-3 py-2 w-28"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-600">訂單編號</span>
          <input
            type="text"
            value={orderNoFilter}
            onChange={(e) => setOrderNoFilter(e.target.value)}
            placeholder="部分比對"
            className="rounded border border-stone-300 px-3 py-2 w-36"
          />
        </label>
        <button
          type="button"
          onClick={fetchOrders}
          className="rounded-lg bg-amber-600 px-4 py-2 text-white font-medium hover:bg-amber-700"
        >
          查詢
        </button>
        <button
          type="button"
          onClick={downloadOrderDetails}
          disabled={loading || orders.length === 0}
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-amber-800 font-medium hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          訂單明細下載
        </button>
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
                  <th className="px-4 py-2">訂單編號</th>
                  <th className="px-4 py-2 w-28">桌號</th>
                  <th className="px-4 py-2 w-24">金額</th>
                  <th className="px-4 py-2 w-28">狀態</th>
                  <th className="px-4 py-2">時間</th>
                  <th className="px-4 py-2 w-36">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                      查無訂單
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="border-b border-stone-100">
                      <td className="px-4 py-2 font-mono font-medium">{o.orderNo}</td>
                      <td className="px-4 py-2">
                        {editingId === o.id ? (
                          <input
                            type="text"
                            value={editTableNo}
                            onChange={(e) => setEditTableNo(e.target.value)}
                            placeholder="桌號"
                            className="w-24 rounded border border-stone-300 px-2 py-1"
                          />
                        ) : (
                          o.tableNo ?? "—"
                        )}
                      </td>
                      <td className="px-4 py-2 text-amber-700 font-medium">
                        ${(o.totalCents / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        {editingId === o.id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="rounded border border-stone-300 px-2 py-1"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span>{statusLabel[o.status] ?? o.status}</span>
                            {o.status === "PENDING" && (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200">
                                手機點餐（待處理）
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-stone-600">
                        {new Date(o.createdAt).toLocaleString("zh-TW")}
                      </td>
                      <td className="px-4 py-2">
                        {editingId === o.id ? (
                          <span className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={saving}
                              className="text-amber-700 font-medium hover:underline disabled:opacity-50"
                            >
                              {saving ? "儲存中..." : "儲存"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-stone-500 hover:underline"
                            >
                              取消
                            </button>
                          </span>
                        ) : (
                          <span className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(o)}
                              className="text-amber-700 font-medium hover:underline"
                            >
                              編輯
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteOrder(o)}
                              disabled={deletingId === o.id}
                              className="text-red-600 font-medium hover:underline disabled:opacity-50"
                            >
                              {deletingId === o.id ? "刪除中..." : "刪除"}
                            </button>
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
      )}
    </div>
  );
}
