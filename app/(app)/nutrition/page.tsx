import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { NutritionView } from "@/components/nutrition-view";

export const dynamic = "force-dynamic";

type Log = {
  id: string;
  dish_title: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export default async function NutritionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].nutrition;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

  const supabase = await createClient();
  const [{ data: logs }, { data: prof }] = await Promise.all([
    supabase
      .from("macro_log")
      .select("id, dish_title, kcal, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("daily_kcal_goal").eq("id", user.id).single(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
      <NutritionView items={(logs ?? []) as Log[]} goal={prof?.daily_kcal_goal ?? null} />
    </main>
  );
}
