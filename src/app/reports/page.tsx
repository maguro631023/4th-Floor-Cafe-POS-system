"use client";

import { useState, useEffect } from "react";

type ReportPeriod = "day" | "week" | "month";

type ReportData = {
  date?: string;
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
  orderCount: number;
  totalSalesCents: number;
  byProduct: { productId: string; name: string; quantity: number; subtotalCents: number }[];
};

export default function ReportsPage() {
  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [period, setPeriod] = useState<ReportPeriod>("day");
  const [date, setDate] = useState(getLocalDate);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const tz = -new Date().getTimezoneOffset() / 60;
    if (period === "day") {
      fetch(`/api/reports/daily?date=${date}&tz=${tz}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error || !data.date) setReport(null);
          else setReport(data);
        })
        .catch(() => setReport(null))
        .finally(() => setLoading(false));
    } else if (period === "week") {
      fetch(`/api/reports/weekly?date=${date}&tz=${tz}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error || !data.startDate) setReport(null);
          else setReport(data);
        })
        .catch(() => setReport(null))
        .finally(() => setLoading(false));
    } else {
      fetch(`/api/reports/monthly?year=${year}&month=${month}&tz=${tz}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error || data.orderCount === undefined) setReport(null);
          else setReport(data);
        })
        .catch(() => setReport(null))
        .finally(() => setLoading(false));
    }
  }, [period, date, year, month]);

  const periodLabel = report?.startDate
    ? `${report.startDate} ～ ${report.endDate}`
    : report?.date ?? (report?.year && report?.month ? `${report.year}年${report.month}月` : "");

  const downloadReport = () => {
    if (!report) return;
    const title = period === "day" ? "日營收" : period === "week" ? "週營收" : "月營收";
    const lines = [
      `營收報表,${periodLabel}`,
      `訂單數,${report.orderCount} 筆`,
      `總營收(元),${report.totalSalesCents / 100}`,
      "",
      "品名,數量,小計(元)",
      ...report.byProduct.map(
        (row) => `"${(row.name || "").replace(/"/g, '""')}",${row.quantity},${row.subtotalCents / 100}`
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileLabel = periodLabel.replace(/\s*～\s*/g, "-").replace(/年/g, "-").replace(/月/g, "") || "report";
    a.download = `營收報表_${title}_${fileLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">營收報表</h1>

      <div className="flex flex-wrap gap-2">
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 font-medium border transition ${
              period === p
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
            }`}
          >
            {p === "day" ? "日營收報表" : p === "week" ? "週營收報表" : "月營收報表"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {period === "day" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-stone-600">日期</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
        )}
        {period === "week" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-stone-600">選擇週內任一天（以該週一～日統計）</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
        )}
        {period === "month" && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-600">年</span>
              <input
                type="number"
                min={2020}
                max={2030}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
                className="rounded-lg border border-stone-300 px-3 py-2 w-24"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-stone-600">月</span>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="rounded-lg border border-stone-300 px-3 py-2 w-20"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button
          type="button"
          onClick={downloadReport}
          disabled={!report || loading}
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-amber-800 font-medium hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          報表下載
        </button>
      </div>

      {loading && <p className="text-stone-500">載入中...</p>}
      {!loading && report && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-amber-50/50">
            <p className="text-stone-600">
              <strong>期間</strong> {periodLabel} · <strong>訂單數</strong> {report.orderCount} 筆
            </p>
            <p className="text-xl font-bold text-amber-800 mt-1">
              {period === "day" ? "當日" : period === "week" ? "當週" : "當月"}總營收 $
              {(report.totalSalesCents / 100).toLocaleString()}
            </p>
          </div>
          <div className="p-4">
            <h2 className="text-lg font-semibold text-stone-800 mb-3">各品項銷售</h2>
            {report.byProduct.length === 0 ? (
              <p className="text-stone-500">此期間無銷售紀錄</p>
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
