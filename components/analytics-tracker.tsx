"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Self-hosted analytics tracker. Mounted once in the root layout so it covers
 * public pages (landing/login) too — needed for traffic sources and new-vs-returning.
 *
 * Captures pageviews, max scroll depth, and clicks, then ships them to
 * /api/analytics/track via sendBeacon (fire-and-forget). Identifiers are random
 * and stored client-side; `userId` is server-rendered so signed-in events can be
 * stitched to conversions without a per-beacon auth round-trip.
 */

const VID_KEY = "mm-vid";
const SID_KEY = "mm-sid";
const SID_TS_KEY = "mm-sid-ts";
const ACQ_KEY = "mm-acq"; // "acquisition captured for this session" flag
const SESSION_TTL = 30 * 60 * 1000; // 30 min of inactivity ends a session
const ENDPOINT = "/api/analytics/track";

type Ev = {
  vid: string;
  sid: string;
  uid?: string;
  type: "pageview" | "scroll" | "click";
  path: string;
  ref?: string;
  us?: string;
  um?: string;
  uc?: string;
  sd?: number;
};

function uuid(): string {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    /* not available */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function visitorId(): string {
  let v = localStorage.getItem(VID_KEY);
  if (!v) {
    v = uuid();
    localStorage.setItem(VID_KEY, v);
  }
  return v;
}

function sessionId(): string {
  const now = Date.now();
  const ts = Number(sessionStorage.getItem(SID_TS_KEY) || 0);
  let s = sessionStorage.getItem(SID_KEY);
  if (!s || now - ts > SESSION_TTL) {
    s = uuid();
    sessionStorage.setItem(SID_KEY, s);
    sessionStorage.removeItem(ACQ_KEY); // new session → re-capture acquisition info
  }
  sessionStorage.setItem(SID_TS_KEY, String(now));
  return s;
}

function post(events: Ev[]): void {
  if (!events.length) return;
  const body = JSON.stringify({ events });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall back to fetch */
  }
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    /* swallow — analytics must never break the app */
  }
}

export function AnalyticsTracker({ userId }: { userId?: string | null }) {
  const pathname = usePathname();
  const maxScroll = useRef(0);
  const clicks = useRef<Ev[]>([]);

  // Pageview on first mount and every route change.
  useEffect(() => {
    const path = pathname || window.location.pathname;
    const ev: Ev = { vid: visitorId(), sid: sessionId(), type: "pageview", path };
    if (userId) ev.uid = userId;
    if (!sessionStorage.getItem(ACQ_KEY)) {
      sessionStorage.setItem(ACQ_KEY, "1");
      const p = new URLSearchParams(window.location.search);
      ev.ref = document.referrer || undefined;
      ev.us = p.get("utm_source") || undefined;
      ev.um = p.get("utm_medium") || undefined;
      ev.uc = p.get("utm_campaign") || undefined;
    }
    post([ev]);
  }, [pathname, userId]);

  // Scroll depth + click buffer for the current page; flushed when leaving it.
  useEffect(() => {
    const path = pathname || window.location.pathname;
    maxScroll.current = 0;
    clicks.current = [];

    const tag = (): Ev => ({ vid: visitorId(), sid: sessionId(), type: "pageview", path });
    const stamp = (e: Ev): Ev => (userId ? { ...e, uid: userId } : e);

    const onScroll = () => {
      const d = document.documentElement;
      const range = d.scrollHeight - d.clientHeight;
      const pct = range > 0 ? Math.round((d.scrollTop / range) * 100) : 100;
      maxScroll.current = Math.min(100, Math.max(maxScroll.current, pct));
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("a, button, [role='button']");
      if (el) clicks.current.push(stamp({ ...tag(), type: "click" }));
    };
    const flush = () => {
      const batch: Ev[] = [];
      if (maxScroll.current > 0) batch.push(stamp({ ...tag(), type: "scroll", sd: maxScroll.current }));
      if (clicks.current.length) batch.push(...clicks.current);
      maxScroll.current = 0;
      clicks.current = [];
      post(batch);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      flush(); // we're leaving this path — record its scroll/clicks
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [pathname, userId]);

  return null;
}
