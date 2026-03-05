"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
};

export default function HeaderWrapper({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/mobile-order")) {
    return null;
  }
  return <Header user={user} />;
}
