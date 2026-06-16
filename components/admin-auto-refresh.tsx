"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Periodically re-runs the parent server component (the analytics page is
 * force-dynamic, so router.refresh() re-queries the RPC) for near real-time
 * numbers without a full page reload. Renders nothing.
 */
export function AdminAutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), Math.max(5, seconds) * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
