import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import {
  createPinSessionToken,
  PIN_COOKIE_NAME,
  verifyPinSession,
} from "../src/lib/auth/pin";
import { pinAttemptLimiter } from "../src/lib/auth/rate-limit";
import { POST as unlock } from "../src/app/api/pin/unlock/route";
import { POST as logout } from "../src/app/api/pin/logout/route";

const TEST_PIN = "24681012";
const TEST_SECRET = "test-secret-separate-from-pin";

function unlockRequest(
  pin: string | undefined,
  {
    redirectTo = "/",
    ip = "203.0.113.10",
  }: { redirectTo?: string; ip?: string } = {},
) {
  const form = new FormData();
  if (pin !== undefined) form.set("pin", pin);
  form.set("redirectTo", redirectTo);

  return new NextRequest("http://localhost/api/pin/unlock", {
    method: "POST",
    body: form,
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  vi.stubEnv("DASHBOARD_PIN", TEST_PIN);
  vi.stubEnv("DASHBOARD_PIN_SECRET", TEST_SECRET);
  vi.stubEnv("NODE_ENV", "test");
  pinAttemptLimiter.reset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  pinAttemptLimiter.reset();
});

describe("PIN session", () => {
  it("creates and verifies a signed session token", async () => {
    const token = await createPinSessionToken();
    expect(token).toMatch(/^v1\.[a-f0-9]{64}$/);
    await expect(verifyPinSession(token)).resolves.toBe(true);
    await expect(verifyPinSession("v1.invalid")).resolves.toBe(false);
  });

  it("changes when the signing secret changes", async () => {
    const original = await createPinSessionToken();
    vi.stubEnv("DASHBOARD_PIN_SECRET", "different-test-secret");
    await expect(verifyPinSession(original)).resolves.toBe(false);
  });
});

describe("dashboard proxy", () => {
  it("redirects anonymous requests and preserves the intended path", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/?q=banjir"),
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/pin");
    expect(location.searchParams.get("redirectTo")).toBe("/?q=banjir");
  });

  it("allows public PIN routes", async () => {
    const response = await proxy(new NextRequest("http://localhost/pin"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows a valid signed cookie", async () => {
    const token = await createPinSessionToken();
    const response = await proxy(
      new NextRequest("http://localhost/", {
        headers: { cookie: `${PIN_COOKIE_NAME}=${token}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("PIN API", () => {
  it("fails closed when the PIN is not configured", async () => {
    vi.stubEnv("DASHBOARD_PIN", "");
    const response = await unlock(unlockRequest(TEST_PIN));
    expect(response.headers.get("location")).toContain("error=config");
  });

  it("fails closed when the signing secret is not configured", async () => {
    vi.stubEnv("DASHBOARD_PIN_SECRET", "");
    const response = await unlock(unlockRequest(TEST_PIN));
    expect(response.headers.get("location")).toContain("error=config");
  });
  it("rejects an empty PIN", async () => {
    const response = await unlock(unlockRequest(undefined));
    expect(response.headers.get("location")).toContain("error=missing");
  });

  it("rejects a wrong PIN without setting a session", async () => {
    const response = await unlock(unlockRequest("00000000"));
    expect(response.headers.get("location")).toContain("error=invalid");
    expect(response.cookies.get(PIN_COOKIE_NAME)).toBeUndefined();
  });

  it("sets a protected cookie and blocks an external redirect", async () => {
    const response = await unlock(
      unlockRequest(TEST_PIN, { redirectTo: "//evil.example" }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(response.cookies.get(PIN_COOKIE_NAME)?.value).toMatch(/^v1\./);

    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
  });

  it("rate-limits the fifth failed attempt for the same client", async () => {
    for (let attempt = 1; attempt < 5; attempt++) {
      const response = await unlock(unlockRequest("00000000"));
      expect(response.headers.get("location")).toContain("error=invalid");
    }

    const limited = await unlock(unlockRequest("00000000"));
    expect(limited.headers.get("location")).toContain("error=rate_limit");
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("clears failed attempts after a successful unlock", async () => {
    await unlock(unlockRequest("00000000"));
    await unlock(unlockRequest(TEST_PIN));

    for (let attempt = 1; attempt < 5; attempt++) {
      const response = await unlock(unlockRequest("00000000"));
      expect(response.headers.get("location")).toContain("error=invalid");
    }
  });

  it("clears the session cookie on logout", async () => {
    const response = await logout(
      new NextRequest("http://localhost/api/pin/logout", { method: "POST" }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/pin");
    expect(response.cookies.get(PIN_COOKIE_NAME)?.value).toBe("");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
