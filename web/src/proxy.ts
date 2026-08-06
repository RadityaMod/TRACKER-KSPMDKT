import { NextResponse, type NextRequest } from "next/server";
import { PIN_COOKIE_NAME, verifyPinSession } from "@/lib/auth/pin";

const PUBLIC_PREFIXES = ["/pin", "/api/pin"];
const PUBLIC_FILES = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_FILES.includes(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function loginUrl(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  url.pathname = "/pin";
  url.search = "";
  url.searchParams.set("redirectTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return url;
}

export async function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(PIN_COOKIE_NAME)?.value;
  if (await verifyPinSession(token)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(loginUrl(request));
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/favicon.ico"],
};
