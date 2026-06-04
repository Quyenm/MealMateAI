import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { SettingsTabs } from "@/components/settings-tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].shell;
  const numLocale = locale === "en" ? "en-US" : "vi-VN";

  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: profile }, scansC, savedC, postsC] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, email, avatar_url, tier, created_at, dietary_pref, cook_time_pref, spice_pref, allergies, never_suggest",
      )
      .eq("id", user.id)
      .maybeSingle(),
    admin.from("scans").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
    admin.from("saved_dishes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const email = profile?.email ?? user.email ?? "";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(numLocale, { year: "numeric", month: "short" })
    : "—";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.settings}</h1>
      <SettingsTabs
        profile={{
          email,
          displayName: profile?.display_name ?? "",
          avatarUrl: profile?.avatar_url ?? null,
          tier: profile?.tier ?? "free",
          memberSince,
          stats: { scans: scansC.count ?? 0, saved: savedC.count ?? 0, posts: postsC.count ?? 0 },
        }}
        prefs={{
          dietary_pref: profile?.dietary_pref ?? "none",
          cook_time_pref: profile?.cook_time_pref ?? "15min",
          spice_pref: profile?.spice_pref ?? "medium",
          allergies: profile?.allergies ?? [],
          never_suggest: profile?.never_suggest ?? [],
        }}
      />
    </main>
  );
}
