export const PIN_COOKIE_NAME = "ksp_dashboard_pin";
export const PIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

export function dashboardPinConfigured(): boolean {
  return Boolean(getDashboardPin());
}

export function getDashboardPin(): string | undefined {
  const pin = process.env.DASHBOARD_PIN?.trim();
  return pin ? pin : undefined;
}

function getSessionSecret(): string | undefined {
  const secret = process.env.DASHBOARD_PIN_SECRET?.trim();
  return secret || getDashboardPin();
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;

  for (let i = 0; i < max; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return mismatch === 0;
}

export async function createPinSessionToken(): Promise<string | undefined> {
  const pin = getDashboardPin();
  const secret = getSessionSecret();
  if (!pin || !secret) return undefined;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`ksp-mendekat-pin-session:v1:${pin}`),
  );

  return `v1.${toHex(signature)}`;
}

export async function verifyPinSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const expected = await createPinSessionToken();
  if (!expected) return false;

  return safeEqual(token, expected);
}

export function verifyDashboardPin(input: string): boolean {
  const pin = getDashboardPin();
  if (!pin) return false;

  return safeEqual(input.trim(), pin);
}