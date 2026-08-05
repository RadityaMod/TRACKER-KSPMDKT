import { NextResponse, type NextRequest } from "next/server";
import { PIN_COOKIE_NAME } from "@/lib/auth/pin";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/pin", request.url), 303);
  response.cookies.set(PIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}