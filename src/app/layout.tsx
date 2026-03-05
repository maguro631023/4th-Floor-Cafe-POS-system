import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth";
import HeaderWrapper from "./components/HeaderWrapper";

export const metadata: Metadata = {
  title: "4樓咖啡 POS",
  description: "新北景觀咖啡廳 4樓咖啡 收銀系統",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <html lang="zh-TW">
      <body className="antialiased min-h-screen bg-stone-100">
        <HeaderWrapper user={session.user ?? null} />
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
