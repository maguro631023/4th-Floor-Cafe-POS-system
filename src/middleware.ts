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
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
