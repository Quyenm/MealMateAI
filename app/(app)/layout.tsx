import { Suspense } from "react";
import { getCurrentUser, getIsAdmin } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";

/**
 * Authenticated app shell.
 *
 * Kept SYNCHRONOUS on purpose: an async layout would block every client
 * navigation on its own getUser()/profiles round-trip BEFORE the page's
 * loading.tsx skeleton can render (in Next 16, loading.js does not wrap
 * layout.js). By moving the auth-gated nav into its own <Suspense> boundary,
 * the shell renders instantly and the nav streams in.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col pb-20">{children}</div>
      <Suspense fallback={<NavFallback />}>
        <AppNav />
      </Suspense>
    </div>
  );
}

/** Async island: resolves the user + admin flag without blocking the shell. */
async function AppNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isAdmin = await getIsAdmin();
  return <BottomNav isAdmin={isAdmin} />;
}

/** Reserve the nav bar's footprint so the page doesn't shift when it streams in. */
function NavFallback() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 h-[57px] border-t border-border bg-background/95 backdrop-blur" />
  );
}
