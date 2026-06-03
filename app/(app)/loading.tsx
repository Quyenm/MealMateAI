/**
 * Instant loading skeleton shown on navigation into any (app) route while the
 * page's dynamic data streams in. Shared across home/scan/history/upgrade/admin
 * — a light, neutral placeholder is intentional so it fits every screen.
 */
export default function AppLoading() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      <div className="mt-1 h-5 w-40 animate-pulse rounded bg-foreground/[0.07]" />
      <div className="h-36 animate-pulse rounded-3xl bg-foreground/[0.07]" />
      <div className="h-14 animate-pulse rounded-2xl bg-foreground/[0.07]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-2xl bg-foreground/[0.07]" />
        <div className="h-24 animate-pulse rounded-2xl bg-foreground/[0.07]" />
      </div>
      <div className="h-4 w-24 animate-pulse rounded bg-foreground/[0.07]" />
      <div className="h-16 animate-pulse rounded-xl bg-foreground/[0.07]" />
    </main>
  );
}
