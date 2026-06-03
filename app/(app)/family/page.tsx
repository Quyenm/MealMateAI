import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { FamilyView } from "@/components/family-view";

export const dynamic = "force-dynamic";

type MemberRow = { user_id: string; role: string; profiles: { email: string } | null };

export default async function FamilyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].family;

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let household: { id: string; name: string; join_code: string } | null = null;
  let members: { user_id: string; role: string; email: string }[] = [];
  if (me?.household_id) {
    const [{ data: hh }, { data: mem }] = await Promise.all([
      admin.from("households").select("id, name, join_code").eq("id", me.household_id).single(),
      admin
        .from("household_members")
        .select("user_id, role, profiles(email)")
        .eq("household_id", me.household_id),
    ]);
    household = hh;
    members = ((mem ?? []) as unknown as MemberRow[]).map((m) => ({
      user_id: m.user_id,
      role: m.role,
      email: m.profiles?.email ?? "",
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
      <FamilyView household={household} members={members} meId={user.id} />
    </main>
  );
}
