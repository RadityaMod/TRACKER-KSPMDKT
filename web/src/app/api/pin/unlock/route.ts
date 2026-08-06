import { NextResponse, type NextRequest } from "next/server";
import {
  createPinSessionToken,
  dashboardPinConfigured,
  PIN_COOKIE_MAX_AGE,
  PIN_COOKIE_NAME,
  verifyDashboardPin,
} from "@/lib/auth/pin";
import { pinAttemptLimiter } from "@/lib/auth/rate-limit";

function safeRedirect(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function pinUrl(request: NextRequest, error: string, redirectTo: string): URL {
  const url = new URL("/pin", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("redirectTo", redirectTo);
  return url;
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function rateLimitedResponse(
  request: NextRequest,
  redirectTo: string,
  retryAfterSeconds: number,
) {
  const response = NextResponse.redirect(
    pinUrl(request, "rate_limit", redirectTo),
    303,
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const redirectTo = safeRedirect(form.get("redirectTo"));
  const pin = form.get("pin");

  const key = clientKey(request);

  const currentLimit = pinAttemptLimiter.check(key);
  if (!currentLimit.allowed) {
    return rateLimitedResponse(
      request,
      redirectTo,
      currentLimit.retryAfterSeconds,
    );
  }
  if (!dashboardPinConfigured()) {
    return NextResponse.redirect(pinUrl(request, "config", redirectTo), 303);
  }

  if (typeof pin !== "string" || !pin.trim()) {
    return NextResponse.redirect(pinUrl(request, "missing", redirectTo), 303);
  }

  if (!verifyDashboardPin(pin)) {
    const nextLimit = pinAttemptLimiter.recordFailure(key);
    if (!nextLimit.allowed) {
      return rateLimitedResponse(
        request,
        redirectTo,
        nextLimit.retryAfterSeconds,
      );
    }
    return NextResponse.redirect(pinUrl(request, "invalid", redirectTo), 303);
  }

  const token = await createPinSessionToken();
  if (!token) {
    return NextResponse.redirect(pinUrl(request, "config", redirectTo), 303);
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url), 303);
  pinAttemptLimiter.reset(key);
  response.cookies.set(PIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PIN_COOKIE_MAX_AGE,
  });

  return response;
}