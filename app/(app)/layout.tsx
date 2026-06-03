import { Suspense } from "react";
import { getCurrentUser, getIsAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";

/**
 * Authenticated app shell. Responsive:
 *  - lg+ : a fixed left sidebar rail + content offset by it (desktop dashboard).
 *  - <lg : a sticky top header + a fixed bottom nav (mobile app).
 *
 * Kept SYNCHRONOUS so client navigations show the page's loading.tsx skeleton
 * instantly; the auth-gated nav (sidebar + bottom bar) streams in via Suspense.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col lg:pl-64">
      <AppHeader />
      <div className="flex flex-1 flex-col pb-20 lg:pb-0">{children}</div>
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
  return (
    <>
      <AppSidebar isAdmin={isAdmin} />
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}

/** Reserve the nav footprints so content doesn't shift when they stream in. */
function NavFallback() {
  return (
    <>
      <div className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card/60 lg:block" />
      <div className="fixed inset-x-0 bottom-0 z-40 h-[57px] border-t border-border bg-background/95 backdrop-blur lg:hidden" />
    </>
  );
}
