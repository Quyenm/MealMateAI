import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { PaidButton } from "@/components/paid-button";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// Receiving account (MoMo / napas247 VietQR).
const MOMO_PHONE = "0336427958";
const MOMO_NAME = "Nguyễn Mạnh Quyền";

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams; // Next.js 16: searchParams is async
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].pay;
  const numLocale = locale === "en" ? "en-US" : "vi-VN";

  const { data: ti } = await supabase
    .from("tier_limits")
    .select("display_label, price_vnd")
    .eq("tier", tier ?? "")
    .maybeSingle();
  if (!ti || ti.price_vnd <= 0) redirect("/upgrade");

  // Note lets the admin match a transfer to this user + tier.
  const note = `MM ${(tier ?? "").toUpperCase()} ${user.id.slice(0, 6)}`;
  const amount = `${ti.price_vnd.toLocaleString(numLocale)}đ`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-bold tracking-tight">
        {t.title} — {ti.display_label}
      </h1>

      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-5 shadow-card ring-1 ring-border/60">
        <p className="text-sm font-semibold">{t.heading}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/momo-qr.jpg" alt="" className="w-56 rounded-2xl ring-1 ring-border" />

        <dl className="w-full divide-y divide-border/60 overflow-hidden rounded-2xl bg-background text-sm ring-1 ring-border/60">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="text-muted-foreground">{t.receiver}</dt>
            <dd className="text-right font-medium">
              {MOMO_NAME} · {MOMO_PHONE}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="text-muted-foreground">{t.amount}</dt>
            <dd className="font-bold text-primary">{amount}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="text-muted-foreground">{t.note}</dt>
            <dd className="font-mono font-semibold">{note}</dd>
          </div>
        </dl>

        <p className="text-center text-xs text-muted-foreground">{t.hint}</p>
        <PaidButton tier={tier ?? ""} />
      </div>

      <Link
        href="/upgrade"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}
      >
        <ChevronLeft className="size-4" /> {t.backToPlans}
      </Link>
    </main>
  );
}
