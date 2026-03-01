import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4樓咖啡 POS",
  description: "新北景觀咖啡廳 4樓咖啡 收銀系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased min-h-screen bg-stone-100">
        <header className="bg-amber-900 text-amber-50 py-3 px-4 shadow">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold">4樓咖啡 POS</h1>
            <nav className="flex gap-4">
              <a href="/" className="hover:underline">收銀</a>
              <a href="/products" className="hover:underline">品項管理</a>
              <a href="/categories" className="hover:underline">分類管理</a>
              <a href="/reports" className="hover:underline">營收報表</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
