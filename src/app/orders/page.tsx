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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tableFilter, setTableFilter] = useState("");
  const [orderNoFilter, setOrderNoFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("date", date);
    if (tableFilter.trim()) params.set("table", tableFilter.trim());
    if (orderNoFilter.trim()) params.set("orderNo", orderNoFilter.trim());
    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [date, tableFilter, orderNoFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const statusLabel: Record<string, string> = {
    PENDING: "待處理",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">訂單查詢</h1>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-600">日期</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-stone-300 px-3 py-2"
          />
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
      </div>

      {loading && <p className="text-stone-500">載入中...</p>}
      {!loading && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-600 border-b border-stone-200 bg-stone-50">
                  <th className="px-4 py-2">訂單編號</th>
                  <th className="px-4 py-2 w-20">桌號</th>
                  <th className="px-4 py-2 w-24">金額</th>
                  <th className="px-4 py-2 w-24">狀態</th>
                  <th className="px-4 py-2">時間</th>
                  <th className="px-4 py-2 w-16"></th>
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
                  orders.flatMap((o) => [
                    <tr
                      key={o.id}
                      className="border-b border-stone-100 hover:bg-stone-50/50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    >
                        <td className="px-4 py-2 font-mono font-medium">{o.orderNo}</td>
                        <td className="px-4 py-2">{o.tableNo ?? "—"}</td>
                        <td className="px-4 py-2 text-amber-700 font-medium">
                          ${(o.totalCents / 100).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{statusLabel[o.status] ?? o.status}</td>
                        <td className="px-4 py-2 text-stone-600">
                          {new Date(o.createdAt).toLocaleString("zh-TW")}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-amber-700 text-xs">
                            {expandedId === o.id ? "收起" : "明細"}
                          </span>
                        </td>
                      </tr>,
                    expandedId === o.id && (
                      <tr key={`${o.id}-detail`}>
                        <td colSpan={6} className="px-4 py-3 bg-amber-50/50">
                          <div className="text-sm">
                            <p className="font-medium text-stone-700 mb-2">訂單明細</p>
                            <ul className="space-y-1">
                              {o.items.map((item) => (
                                <li key={item.id} className="flex justify-between text-stone-600">
                                  <span>
                                    {item.product.name} × {item.quantity}
                                  </span>
                                  <span className="text-amber-700">
                                    ${(item.subtotalCents / 100).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ),
                  ])
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
