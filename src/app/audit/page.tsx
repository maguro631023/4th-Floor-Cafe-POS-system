"use client";

import { useState, useEffect, useCallback } from "react";

type AuditLog = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
};

const RESOURCE_LABELS: Record<string, string> = {
  user: "使用者",
  product: "品項",
  category: "分類",
  order: "訂單",
  stock: "庫存",
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "登入",
  LOGOUT: "登出",
  CREATE: "新增",
  UPDATE: "修改",
  DELETE: "刪除",
  CHECKOUT: "結帳",
  STOCK_ADJUST: "庫存調整",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (resourceFilter) params.set("resource", resourceFilter);
    if (actionFilter) params.set("action", actionFilter);
    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
        if (typeof data.total === "number") setTotal(data.total);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page, resourceFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">系統操作稽核日誌</h1>
      <p className="text-stone-600 text-sm">記錄所有按鈕操作與系統變更。</p>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-600">資源</span>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="rounded border border-stone-300 px-3 py-2"
          >
            <option value="">全部</option>
            {Object.entries(RESOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-600">操作</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded border border-stone-300 px-3 py-2"
          >
            <option value="">全部</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={fetchLogs}
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
                  <th className="px-4 py-2">時間</th>
                  <th className="px-4 py-2">操作者</th>
                  <th className="px-4 py-2 w-20">操作</th>
                  <th className="px-4 py-2 w-20">資源</th>
                  <th className="px-4 py-2">資源 ID</th>
                  <th className="px-4 py-2">說明</th>
                  <th className="px-4 py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                      尚無稽核紀錄
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-stone-100">
                      <td className="px-4 py-2 text-stone-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("zh-TW")}
                      </td>
                      <td className="px-4 py-2">{log.userEmail ?? "—"}</td>
                      <td className="px-4 py-2">{ACTION_LABELS[log.action] ?? log.action}</td>
                      <td className="px-4 py-2">{RESOURCE_LABELS[log.resource] ?? log.resource}</td>
                      <td className="px-4 py-2 font-mono text-xs">{log.resourceId ?? "—"}</td>
                      <td className="px-4 py-2 text-stone-600 max-w-xs truncate">{log.details ?? "—"}</td>
                      <td className="px-4 py-2 text-stone-500 text-xs">{log.ip ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > 50 && (
            <div className="px-4 py-2 border-t border-stone-100 flex justify-between items-center text-sm text-stone-600">
              <span>共 {total} 筆</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-amber-700 hover:underline disabled:opacity-50"
                >
                  上一頁
                </button>
                <span>第 {page} 頁</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 50 >= total}
                  className="text-amber-700 hover:underline disabled:opacity-50"
                >
                  下一頁
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
