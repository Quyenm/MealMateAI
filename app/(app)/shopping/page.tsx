import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { ShoppingList } from "@/components/shopping-list";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].shopping;

  const supabase = await createClient();
  const { data } = await supabase
    .from("shopping_items")
    .select("id, name, checked")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
      <ShoppingList initial={(data ?? []) as { id: string; name: string; checked: boolean }[]} />
    </main>
  );
}
