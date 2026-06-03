import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { MealPlan } from "@/components/meal-plan";

export const dynamic = "force-dynamic";

type Dish = { title_vi: string; title_en?: string; image?: { url: string } };

/** 7 calendar dates (YYYY-MM-DD) starting today, in Asia/Ho_Chi_Minh. */
function weekDays(): string[] {
  const todayVN = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const base = new Date(todayVN + "T00:00:00Z").getTime();
  return Array.from({ length: 7 }, (_, i) => new Date(base + i * 86_400_000).toISOString().slice(0, 10));
}

export default async function PlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].mealPlan;
  const days = weekDays();

  const supabase = await createClient();
  const [{ data: planRows }, { data: favRows }] = await Promise.all([
    supabase
      .from("meal_plan_items")
      .select("id, plan_date, dish")
      .eq("user_id", user.id)
      .gte("plan_date", days[0])
      .lte("plan_date", days[6]),
    supabase
      .from("saved_dishes")
      .select("id, dish")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
      <MealPlan
        days={days}
        todayStr={days[0]}
        initial={(planRows ?? []) as { id: string; plan_date: string; dish: Dish }[]}
        favorites={(favRows ?? []) as { id: string; dish: Dish }[]}
      />
    </main>
  );
}
