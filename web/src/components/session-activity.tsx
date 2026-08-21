"use client";

import { useEffect } from "react";

const IDLE_LIMIT_MS = 24 * 60 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

export function SessionActivity() {
  useEffect(() => {
    let lastActivity = Date.now();
    let lastHeartbeat = lastActivity;
    let activitySinceHeartbeat = false;
    let locking = false;

    const lock = async () => {
      if (locking) return;
      locking = true;
      try {
        await fetch("/api/pin/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      } finally {
        window.location.replace("/pin");
      }
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivity >= IDLE_LIMIT_MS) {
        void lock();
        return;
      }
      lastActivity = now;
      activitySinceHeartbeat = true;
    };

    const checkSession = async () => {
      const now = Date.now();
      if (now - lastActivity >= IDLE_LIMIT_MS) {
        await lock();
        return;
      }

      if (
        activitySinceHeartbeat &&
        now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS
      ) {
        const response = await fetch("/api/pin/activity", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.status === 401) {
          await lock();
          return;
        }
        if (response.ok) {
          activitySinceHeartbeat = false;
          lastHeartbeat = now;
        }
      }
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((event) =>
      window.addEventListener(event, recordActivity, { passive: true }),
    );

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") recordActivity();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const timer = window.setInterval(() => void checkSession(), CHECK_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
