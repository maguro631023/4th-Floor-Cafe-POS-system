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
        <nav className="header-nav flex items-center gap-4" data-user-role={user.role}>
          <a href="/" className="hover:underline">收銀</a>
          <a href="/orders" className="hover:underline">訂單查詢</a>
          <span className="header-nav-manager inline-flex items-center gap-4">
            <a href="/orders/manage" className="hover:underline">訂單管理</a>
            <a href="/products" className="hover:underline">品項管理</a>
            <a href="/inventory" className="hover:underline">庫存管理</a>
            <a href="/reports" className="hover:underline">營收報表</a>
          </span>
          <span className="header-nav-admin inline-flex items-center gap-4">
            <a href="/users" className="hover:underline">使用者管理</a>
            <a href="/audit" className="hover:underline">系統操作稽核日誌</a>
          </span>
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
