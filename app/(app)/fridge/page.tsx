import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { FridgeList } from "@/components/fridge-list";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  name: string;
  name_en: string | null;
  amount: string | null;
  expiry_date: string | null;
};

export default async function FridgePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].fridge;

  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_items")
    .select("id, name, name_en, amount, expiry_date")
    .eq("user_id", user.id)
    .order("expiry_date", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
      <FridgeList initial={(data ?? []) as Item[]} />
    </main>
  );
}
