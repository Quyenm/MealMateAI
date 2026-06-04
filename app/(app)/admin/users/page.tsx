import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { AdminUsers } from "@/components/admin-users";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/home");

  const locale = await getLocale();
  const t = STR[locale].admin;
  const numLocale = locale === "en" ? "en-US" : "vi-VN";

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, tier, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {t.overview}
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.usersTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.usersSub}</p>
      </div>
      <AdminUsers users={data ?? []} numLocale={numLocale} />
    </main>
  );
}
