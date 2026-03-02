import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromCookie, sessionOptions } from "@/lib/auth";

const publicPaths = ["/login"];
const authApiPrefix = "/api/auth/";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith(authApiPrefix) || publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (pathname === "/login") {
      const cookie = request.cookies.get(sessionOptions.cookieName)?.value;
      if (cookie) {
        const data = await getSessionFromCookie(cookie);
        if (data?.user) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    }
    return NextResponse.next();
  }

  const cookie = request.cookies.get(sessionOptions.cookieName)?.value;
  if (!cookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  const data = await getSessionFromCookie(cookie);
  if (!data?.user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  const role = data.user.role;
  // 櫃台(STAFF)：僅允許 收銀(/) 與 訂單查詢(/orders，不含 /orders/manage)
  const staffOnlyPaths = ["/orders/manage", "/products", "/inventory", "/reports", "/users"];
  if (role === "STAFF" && staffOnlyPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // 店長(MANAGER)：僅隱藏 使用者管理
  if (role === "MANAGER" && (pathname === "/users" || pathname.startsWith("/users/"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
