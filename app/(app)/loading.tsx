/**
 * Instant loading skeleton shown on navigation into any (app) route while the
 * page's dynamic data streams in. Shared across home/scan/history/upgrade/admin
 * — a light, neutral placeholder is intentional so it fits every screen.
 */
export default function AppLoading() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      <div className="flex items-center gap-3 pt-1">
        <div className="size-11 animate-pulse rounded-2xl bg-foreground/[0.07]" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-20 animate-pulse rounded bg-foreground/[0.07]" />
          <div className="h-3.5 w-32 animate-pulse rounded bg-foreground/[0.07]" />
        </div>
      </div>
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
