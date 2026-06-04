import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { AdminPaymentActions } from "@/components/admin-payment-actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  amount_vnd: number;
  tier_purchased: string;
  user_id: string;
  created_at: string;
  profiles: { email: string } | null;
};

export default async function AdminPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/home");

  const locale = await getLocale();
  const t = STR[locale].admin;
  const numLocale = locale === "en" ? "en-US" : "vi-VN";

  const admin = createAdminClient();
  const { data } = await admin
    .from("payments")
    .select("id, amount_vnd, tier_purchased, user_id, created_at, profiles(email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
        </div>
        <Link
          href="/admin/images"
          className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
        >
          {t.imgTitle}
        </Link>
      </div>

      {rows.length === 0 && (
        <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card ring-1 ring-border/60">
          {t.empty}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      {rows.map((p) => {
        const note = `MM ${p.tier_purchased.toUpperCase()} ${p.user_id.slice(0, 6)}`;
        return (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card ring-1 ring-border/60"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold tracking-tight">{p.tier_purchased.toUpperCase()}</span>
              <span className="font-bold text-primary">
                {p.amount_vnd.toLocaleString(numLocale)}đ
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <p>
                <span className="text-muted-foreground">{t.user}: </span>
                {p.profiles?.email ?? "?"}
              </p>
              <p>
                <span className="text-muted-foreground">{t.matchNote}: </span>
                <span className="font-mono font-semibold">{note}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString(numLocale)}
              </p>
            </div>
            <AdminPaymentActions paymentId={p.id} />
          </div>
        );
      })}
      </div>
    </main>
  );
}
