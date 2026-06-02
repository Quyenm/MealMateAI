import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Clock, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

type Quota = { tier: string; used: number; scan_limit: number; remaining: number };
type RecentScan = { id: string; created_at: string; suggestions: { dishes: { title_vi: string }[] }[] };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: qData } = await supabase.rpc("get_quota_status", { p_user: user.id });
  const q = (Array.isArray(qData) ? qData[0] : qData) as Quota | null;
  const used = q?.used ?? 0;
  const limit = q?.scan_limit ?? 3;
  const remaining = q?.remaining ?? Math.max(limit - used, 0);
  const tier = q?.tier ?? "free";
  const remainingPct = limit > 0 ? Math.max(0, Math.round((remaining / limit) * 100)) : 0;

  const { data: rData } = await supabase
    .from("scans")
    .select("id, created_at, suggestions(dishes)")
    .eq("user_id", user.id)
    .eq("status", "suggested")
    .order("created_at", { ascending: false })
    .limit(3);
  const recent = (rData ?? []) as unknown as RecentScan[];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      {/* header */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" className="h-11 w-11 rounded-2xl" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Xin chào 👋</p>
            <p className="truncate text-sm font-semibold">{user.email}</p>
          </div>
        </div>
        <SignOutButton />
      </header>

      {/* quota hero */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#2ba3d9] to-[#1b7aa8] text-white shadow-lg">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">Lượt quét hôm nay</span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase">
              {tier}
            </span>
          </div>
          <p className="text-4xl font-extrabold leading-none">
            {remaining}
            <span className="text-xl font-medium text-white/70"> / {limit}</span>
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${remainingPct}%` }} />
          </div>
          <p className="text-xs text-white/70">{used} đã dùng · reset lúc nửa đêm</p>
        </CardContent>
      </Card>

      {/* big scan CTA */}
      <Link
        href="/scan"
        className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:translate-y-px"
      >
        <Camera className="size-5" /> Chụp tủ lạnh
      </Link>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/history" className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
          <Clock className="size-5 text-primary" />
          <span className="text-sm font-semibold">Lịch sử</span>
          <span className="text-xs text-muted-foreground">Xem món đã gợi</span>
        </Link>
        <Link href="/upgrade" className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
          <CreditCard className="size-5 text-primary" />
          <span className="text-sm font-semibold">Các gói</span>
          <span className="text-xs text-muted-foreground">Quét nhiều hơn</span>
        </Link>
      </div>

      {/* recent */}
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Gần đây</p>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Chưa có lần quét nào — bấm <b>Chụp tủ lạnh</b> để bắt đầu!
            </CardContent>
          </Card>
        ) : (
          recent.map((s) => {
            const titles = (s.suggestions?.[0]?.dishes ?? [])
              .slice(0, 3)
              .map((d) => d.title_vi)
              .join(" · ");
            return (
              <Link
                key={s.id}
                href="/history"
                className="rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-sm"
              >
                <p className="line-clamp-1 text-sm font-medium">{titles || "Không có món"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString("vi-VN")}
                </p>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}
