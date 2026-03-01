"use client";

import { useState, useEffect } from "react";

type DailyReport = {
  date: string;
  orderCount: number;
  totalSalesCents: number;
  byProduct: { productId: string; name: string; quantity: number; subtotalCents: number }[];
};

export default function ReportsPage() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const tz = -new Date().getTimezoneOffset() / 60;
    fetch(`/api/reports/daily?date=${date}&tz=${tz}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error || !data.date) setReport(null);
        else setReport(data);
      })
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">營收報表</h1>
      <div className="flex items-center gap-4">
        <label className="text-stone-600">日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2"
        />
      </div>

      {loading && <p className="text-stone-500">載入中...</p>}
      {!loading && report && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-amber-50/50">
            <p className="text-stone-600">
              <strong>日期</strong> {report.date} · <strong>訂單數</strong> {report.orderCount} 筆
            </p>
            <p className="text-xl font-bold text-amber-800 mt-1">
              當日總營收 ${(report.totalSalesCents / 100).toLocaleString()}
            </p>
          </div>
          <div className="p-4">
            <h2 className="text-lg font-semibold text-stone-800 mb-3">各品項銷售</h2>
            {report.byProduct.length === 0 ? (
              <p className="text-stone-500">當日無銷售紀錄</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-stone-600 border-b border-stone-200">
                    <th className="py-2">品名</th>
                    <th className="py-2 text-right">數量</th>
                    <th className="py-2 text-right">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byProduct.map((row) => (
                    <tr key={row.productId} className="border-b border-stone-100">
                      <td className="py-2">{row.name}</td>
                      <td className="py-2 text-right">{row.quantity}</td>
                      <td className="py-2 text-right font-medium text-amber-700">
                        ${(row.subtotalCents / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {!loading && !report && <p className="text-stone-500">無法載入報表</p>}
    </div>
  );
}
