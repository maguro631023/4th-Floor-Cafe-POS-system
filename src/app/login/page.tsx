"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登入失敗");
        return;
      }
      const next = searchParams.get("from") || "/";
      router.push(next);
      router.refresh();
    } catch {
      setError("連線錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-800 text-center mb-2">4樓咖啡 POS</h1>
        <p className="text-stone-500 text-sm text-center mb-6">請登入以繼續</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-600">帳號 (Email)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800"
              placeholder="admin@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-600">密碼</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800"
            />
          </label>
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
}
