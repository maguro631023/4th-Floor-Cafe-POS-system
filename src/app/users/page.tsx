"use client";

import { useState, useEffect, useCallback } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理員",
  MANAGER: "店長",
  STAFF: "櫃台",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER" | "STAFF">("STAFF");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "MANAGER" | "STAFF">("STAFF");
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => {
        if (r.status === 403) throw new Error("無權限");
        return r.json();
      })
      .then(setUsers)
      .catch((e) => {
        setMessage({ type: "err", text: e.message || "無法載入使用者" });
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const submitNew = async () => {
    if (!newEmail.trim() || !newPassword || !newName.trim()) {
      setMessage({ type: "err", text: "請填寫帳號、密碼與姓名" });
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          name: newName.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "新增失敗");
      setUsers((prev) => [data, ...prev]);
      setMessage({ type: "ok", text: "已新增使用者" });
      setShowAdd(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("STAFF");
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "新增失敗" });
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditName(u.name);
    setEditRole(u.role as "ADMIN" | "MANAGER" | "STAFF");
    setEditActive(u.isActive);
    setEditPassword("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: { name?: string; role?: string; isActive?: boolean; password?: string } = {
        name: editName.trim(),
        role: editRole,
        isActive: editActive,
      };
      if (editPassword) body.password = editPassword;
      const res = await fetch(`/api/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新失敗");
      setUsers((prev) =>
        prev.map((x) => (x.id === editingId ? { ...x, ...data } : x))
      );
      setMessage({ type: "ok", text: "已儲存" });
      setEditingId(null);
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "更新失敗" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">使用者與權限管理</h1>
      <p className="text-stone-600 text-sm">
        僅管理員可操作。角色：管理員（含使用者管理）、店長（不含使用者管理）、櫃台（收銀與查詢等）。
      </p>

      {message && (
        <p className={message.type === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
          {message.text}
        </p>
      )}

      <div>
        {!showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-white font-medium hover:bg-amber-700"
          >
            新增使用者
          </button>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3 max-w-md">
            <h2 className="font-semibold text-stone-800">新增使用者</h2>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded border border-stone-300 px-3 py-2"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="密碼（至少 6 碼）"
              className="w-full rounded border border-stone-300 px-3 py-2"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="姓名"
              className="w-full rounded border border-stone-300 px-3 py-2"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "ADMIN" | "MANAGER" | "STAFF")}
              className="rounded border border-stone-300 px-3 py-2"
            >
              {(["ADMIN", "MANAGER", "STAFF"] as const).map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
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
                onClick={() => { setShowAdd(false); setMessage(null); }}
                className="rounded border border-stone-300 px-3 py-1.5 text-stone-600 text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-stone-500">載入中...</p>}
      {!loading && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-600 border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">姓名</th>
                <th className="px-4 py-2 w-24">角色</th>
                <th className="px-4 py-2 w-20">狀態</th>
                <th className="px-4 py-2">建立時間</th>
                <th className="px-4 py-2 w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-100">
                  <td className="px-4 py-2 font-mono text-stone-600">{u.email}</td>
                  <td className="px-4 py-2">
                    {editingId === u.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-32 rounded border border-stone-300 px-2 py-1"
                      />
                    ) : (
                      u.name
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as "ADMIN" | "MANAGER" | "STAFF")}
                        className="rounded border border-stone-300 px-2 py-1"
                      >
                        {(["ADMIN", "MANAGER", "STAFF"] as const).map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABEL[u.role] ?? u.role
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === u.id ? (
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        {editActive ? "啟用" : "停用"}
                      </label>
                    ) : (
                      u.isActive ? "啟用" : "停用"
                    )}
                  </td>
                  <td className="px-4 py-2 text-stone-500">
                    {new Date(u.createdAt).toLocaleDateString("zh-TW")}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === u.id ? (
                      <span className="flex gap-2">
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="新密碼（留空不改）"
                          className="w-36 rounded border border-stone-300 px-2 py-1 text-xs"
                        />
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
                          onClick={() => setEditingId(null)}
                          className="text-stone-500 hover:underline"
                        >
                          取消
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(u)}
                        className="text-amber-700 font-medium hover:underline"
                      >
                        編輯
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
