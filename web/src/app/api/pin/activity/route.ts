import { NextResponse, type NextRequest } from "next/server";
import {
  PIN_COOKIE_MAX_AGE,
  PIN_COOKIE_NAME,
  verifyPinSession,
} from "@/lib/auth/pin";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(PIN_COOKIE_NAME)?.value;
  if (!(await verifyPinSession(token))) {
    return new NextResponse(null, { status: 401 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(PIN_COOKIE_NAME, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PIN_COOKIE_MAX_AGE,
  });
  return response;
}
