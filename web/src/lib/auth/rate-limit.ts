const PIN_ATTEMPT_LIMIT = 5;
const PIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type AttemptWindow = {
  failures: number;
  resetAt: number;
};

export type PinRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export class PinAttemptLimiter {
  private readonly attempts = new Map<string, AttemptWindow>();

  check(key: string, now = Date.now()): PinRateLimitResult {
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      if (current) this.attempts.delete(key);
      return {
        allowed: true,
        remaining: PIN_ATTEMPT_LIMIT,
        retryAfterSeconds: 0,
      };
    }

    return {
      allowed: current.failures < PIN_ATTEMPT_LIMIT,
      remaining: Math.max(0, PIN_ATTEMPT_LIMIT - current.failures),
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  recordFailure(key: string, now = Date.now()): PinRateLimitResult {
    const current = this.attempts.get(key);
    const next = !current || current.resetAt <= now
      ? { failures: 1, resetAt: now + PIN_ATTEMPT_WINDOW_MS }
      : { ...current, failures: current.failures + 1 };

    this.attempts.set(key, next);
    return this.check(key, now);
  }

  reset(key?: string) {
    if (key) this.attempts.delete(key);
    else this.attempts.clear();
  }
}

const globalForPinRateLimit = globalThis as typeof globalThis & {
  kspPinAttemptLimiter?: PinAttemptLimiter;
};

/** Best-effort per-instance protection; Vercel Firewall is the global layer. */
export const pinAttemptLimiter =
  globalForPinRateLimit.kspPinAttemptLimiter ??= new PinAttemptLimiter();
