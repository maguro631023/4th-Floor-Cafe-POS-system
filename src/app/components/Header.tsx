"use client";

import { useRouter } from "next/navigation";

type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
};

export default function Header({ user }: { user: SessionUser | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-amber-900 text-amber-50 py-3 px-4 shadow">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold">4樓咖啡 POS</h1>
        {user && (
        <nav className="flex items-center gap-4">
          <a href="/" className="hover:underline">收銀</a>
          <a href="/orders" className="hover:underline">訂單查詢</a>
          <a href="/products" className="hover:underline">品項管理</a>
          <a href="/inventory" className="hover:underline">庫存管理</a>
          <a href="/categories" className="hover:underline">分類管理</a>
          <a href="/reports" className="hover:underline">營收報表</a>
          {user?.role === "ADMIN" && (
            <a href="/users" className="hover:underline">使用者管理</a>
          )}
          <span className="flex items-center gap-2 text-amber-100">
            <span className="text-sm">{user.name}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm underline hover:no-underline"
            >
              登出
            </button>
          </span>
        </nav>
        )}
      </div>
    </header>
  );
}
