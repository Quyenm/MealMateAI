import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("dietary_pref, cook_time_pref, spice_pref, allergies, never_suggest")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto w-full max-w-2xl p-4 lg:p-8">
      <SettingsForm
        initial={{
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
